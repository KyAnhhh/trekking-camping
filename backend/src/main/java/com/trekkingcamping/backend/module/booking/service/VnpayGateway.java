package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.config.VnpayProperties;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class VnpayGateway {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMddHHmmss")
            .withResolverStyle(java.time.format.ResolverStyle.STRICT);
    private static final Set<String> FAILURE_CODES = Set.of("09", "10", "11", "12", "13", "24", "51", "65", "75", "79", "99");
    private final VnpayProperties config;
    public VnpayGateway(VnpayProperties config) { this.config = config; }
    public record VerifiedResult(String orderId, long amount, String orderInfo, boolean success, boolean failed) {}

    public String paymentUrl(MomoPaymentStore.Attempt attempt, String clientIp) {
        config.requireCheckout();
        LocalDateTime created = createdAt(attempt.orderId());
        LocalDateTime expires = created.plusMinutes(15);
        if (!expires.isAfter(LocalDateTime.now(ZONE))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phiên VNPAY đã hết hạn và chưa có kết quả xác minh. Vui lòng liên hệ quản trị viên đối soát trước khi thanh toán lại.");
        }
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", config.getTmnCode());
        params.put("vnp_Amount", Long.toString(Math.multiplyExact(attempt.amount(), 100L)));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", attempt.orderId());
        params.put("vnp_OrderInfo", attempt.orderInfo());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        params.put("vnp_IpAddr", "::1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp) ? "127.0.0.1" : clientIp);
        params.put("vnp_CreateDate", DATE.format(created));
        params.put("vnp_ExpireDate", DATE.format(expires));
        String query = canonical(params);
        return config.getPaymentUrl() + "?" + query + "&vnp_SecureHash=" + sign(query);
    }

    public VerifiedResult verify(Map<String, String[]> raw) {
        config.requireCredentials();
        if (raw.size() > 50) throw invalid();
        Map<String, String> params = new TreeMap<>();
        raw.forEach((name, values) -> {
            if (!name.matches("vnp_[A-Za-z0-9]+") || values == null || values.length != 1
                    || values[0] == null || values[0].length() > 2048) throw invalid();
            params.put(name, values[0]);
        });
        String suppliedHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        if (suppliedHash == null || !suppliedHash.matches("[a-fA-F0-9]{128}")) throw invalid();
        if (!MessageDigest.isEqual(HexFormat.of().parseHex(sign(canonical(params))), HexFormat.of().parseHex(suppliedHash))) throw invalid();
        if (!config.getTmnCode().equals(params.get("vnp_TmnCode"))) throw invalid();
        if (params.containsKey("vnp_CurrCode") && !"VND".equals(params.get("vnp_CurrCode"))) throw invalid();
        String orderId = params.get("vnp_TxnRef"), amount = params.get("vnp_Amount");
        createdAt(orderId); // Our persistent reference format; never use a client booking ID.
        if (amount == null || !amount.matches("[0-9]{1,12}")) throw invalid();
        long minorUnits = Long.parseLong(amount);
        if (minorUnits <= 0 || minorUnits % 100 != 0) throw invalid();
        String orderInfo = params.get("vnp_OrderInfo"), responseCode = params.get("vnp_ResponseCode"), status = params.get("vnp_TransactionStatus");
        if (orderInfo == null || orderInfo.isBlank() || orderInfo.length() > 255
                || responseCode == null || !responseCode.matches("[0-9]{2}")
                || status == null || !status.matches("[0-9]{2}")) throw invalid();
        boolean success = "00".equals(responseCode) && "00".equals(status);
        if (success) {
            String transactionNo = params.get("vnp_TransactionNo"), payDate = params.get("vnp_PayDate");
            if (transactionNo == null || !transactionNo.matches("[0-9]{1,20}") || transactionNo.matches("0+")) throw invalid();
            try { LocalDateTime.parse(payDate, DATE); } catch (RuntimeException e) { throw invalid(); }
        }
        // Ambiguous/processing/fraud statuses keep the attempt pending for reconciliation.
        boolean failed = FAILURE_CODES.contains(responseCode) && "02".equals(status);
        return new VerifiedResult(orderId, minorUnits / 100, orderInfo, success, failed);
    }

    public boolean expired(String orderId) { return !createdAt(orderId).plusMinutes(15).isAfter(LocalDateTime.now(ZONE)); }
    boolean expirySettled(String orderId) { return !createdAt(orderId).plusMinutes(16).isAfter(LocalDateTime.now(ZONE)); }
    LocalDateTime createdAt(String orderId) {
        if (orderId == null || !orderId.matches("VN[0-9]{14}[a-f0-9]{32}")) throw invalid();
        try { return LocalDateTime.parse(orderId.substring(2, 16), DATE); }
        catch (RuntimeException e) { throw invalid(); }
    }
    private String canonical(Map<String, String> values) {
        // Servlet parameters are decoded once; encode exactly once for both signing and URL.
        return new TreeMap<>(values).entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue())).collect(Collectors.joining("&"));
    }
    private String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(config.getHashSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Không thể ký yêu cầu VNPAY.");
        }
    }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chữ ký hoặc dữ liệu trả về từ VNPAY không hợp lệ.");
    }
}
