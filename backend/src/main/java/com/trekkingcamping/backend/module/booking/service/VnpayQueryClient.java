package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.trekkingcamping.backend.config.VnpayProperties;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

/** Query only: never sends a new charge or a refund. HTTP runs outside DB transactions. */
@Component
public class VnpayQueryClient {
    private static final String ENDPOINT = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String[] SIGNED_FIELDS = {"vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message",
            "vnp_TmnCode", "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
            "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo", "vnp_PromotionCode", "vnp_PromotionAmount"};
    private final VnpayProperties config;
    private final VnpayGateway gateway;
    public record QueryResult(String orderId, long amount, String orderInfo, boolean success, boolean failed, boolean expired) {}
    private final RestTemplate http = new org.springframework.boot.web.client.RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5)).setReadTimeout(Duration.ofSeconds(15)).build();
    public VnpayQueryClient(VnpayProperties config, VnpayGateway gateway) { this.config = config; this.gateway = gateway; }

    public QueryResult query(MomoPaymentStore.Attempt attempt, String ip) {
        config.requireCredentials();
        Map<String, String> request = new LinkedHashMap<>();
        request.put("vnp_RequestId", UUID.randomUUID().toString().replace("-", ""));
        request.put("vnp_Version", "2.1.0"); request.put("vnp_Command", "querydr");
        request.put("vnp_TmnCode", config.getTmnCode()); request.put("vnp_TxnRef", attempt.orderId());
        request.put("vnp_TransactionDate", DATE.format(gateway.createdAt(attempt.orderId())));
        request.put("vnp_CreateDate", DATE.format(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))));
        request.put("vnp_IpAddr", ip == null || ip.contains(":") ? "127.0.0.1" : ip);
        request.put("vnp_OrderInfo", attempt.orderInfo());
        request.put("vnp_SecureHash", gateway.sign(String.join("|", request.values())));
        JsonNode response;
        try { response = http.postForObject(ENDPOINT, request, JsonNode.class); }
        catch (RestClientException e) { throw unavailable("Chưa kết nối được VNPAY để đối soát. Giao dịch được giữ nguyên; hãy thử lại sau."); }
        if (response == null || !response.isObject()) throw unavailable("Phản hồi đối soát VNPAY không hợp lệ.");
        String responseCode = field(response, "vnp_ResponseCode");
        String signature = field(response, "vnp_SecureHash");
        // Sandbox may return unsigned API error 91 over this fixed HTTPS connection.
        // Never use an unsigned response to confirm money, and never release a still-live URL.
        if (!signature.isEmpty()) verifySignature(response, signature);
        if ("91".equals(responseCode)) {
            if (!gateway.expirySettled(attempt.orderId())) throw unavailable("Phiên vừa hết hạn. Vui lòng chờ một phút rồi thử thanh toán lại.");
            for (String key : List.of("vnp_TmnCode", "vnp_TxnRef")) {
                if (!field(response, key).isBlank() && !field(response, key).equals(request.get(key))) throw unavailable("Giao dịch đối soát không khớp.");
            }
            return new QueryResult(attempt.orderId(), attempt.amount(), attempt.orderInfo(), false, false, true);
        }
        if ("94".equals(responseCode)) throw unavailable("VNPAY đang giới hạn truy vấn lặp cho giao dịch này. Vui lòng chờ vài phút rồi thử lại; trạng thái thanh toán được giữ nguyên.");
        if (!"00".equals(responseCode)) throw unavailable("VNPAY chưa đối soát được giao dịch. Vui lòng thử lại sau hoặc liên hệ quản trị viên.");
        if (signature.isEmpty()) throw unavailable("Phản hồi đối soát thiếu chữ ký VNPAY.");
        if (!config.getTmnCode().equals(field(response, "vnp_TmnCode"))
                || !attempt.orderId().equals(field(response, "vnp_TxnRef"))
                || !"querydr".equals(field(response, "vnp_Command"))
                || !"01".equals(field(response, "vnp_TransactionType"))) throw unavailable("Giao dịch đối soát không khớp.");
        String amount = field(response, "vnp_Amount");
        if (!amount.matches("[0-9]{1,12}") || Long.parseLong(amount) != Math.multiplyExact(attempt.amount(), 100L)) throw unavailable("Số tiền đối soát không khớp.");
        String status = field(response, "vnp_TransactionStatus");
        boolean success = "00".equals(status), failed = Set.of("02", "11").contains(status);
        if (success && !field(response, "vnp_TransactionNo").matches("[0-9]*[1-9][0-9]*")) throw unavailable("Kết quả thiếu mã thanh toán VNPAY hợp lệ.");
        // Techspec 2.1.0, section 2.5.7.2: 08 = payment timeout, 11 = cancelled.
        // A timeout can still include PayDate/TransactionNo: these alone do not prove payment.
        // Status 01 (incomplete) and all unknown states remain pending.
        boolean unpaidExpired = "08".equals(status);
        return new QueryResult(attempt.orderId(), attempt.amount(), attempt.orderInfo(), success, failed, unpaidExpired);
    }
    private void verifySignature(JsonNode response, String signature) {
        String raw = Arrays.stream(SIGNED_FIELDS).map(key -> field(response, key)).collect(Collectors.joining("|"));
        if (!signature.matches("[a-fA-F0-9]{128}") || !MessageDigest.isEqual(HexFormat.of().parseHex(signature),
                HexFormat.of().parseHex(gateway.sign(raw)))) throw unavailable("Chữ ký đối soát VNPAY không hợp lệ.");
    }
    private String field(JsonNode value, String name) { return value.path(name).isValueNode() && !value.path(name).isNull() ? value.path(name).asText() : ""; }
    private ResponseStatusException unavailable(String message) { return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message); }
}
