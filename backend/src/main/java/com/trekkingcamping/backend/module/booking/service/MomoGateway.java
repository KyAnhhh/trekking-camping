package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.trekkingcamping.backend.config.MomoProperties;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Component
public class MomoGateway {
    private static final String BASE_URL = "https://test-payment.momo.vn";
    private final MomoProperties config;
    private final RestTemplate http;

    public MomoGateway(MomoProperties config) {
        this.config = config;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(35_000);
        this.http = new RestTemplate(factory);
    }

    public JsonNode create(MomoPaymentStore.Attempt attempt) {
        config.requireCheckout();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", config.partnerCode());
        body.put("requestId", attempt.orderId());
        body.put("orderId", attempt.orderId());
        body.put("amount", attempt.amount());
        body.put("orderInfo", attempt.orderInfo());
        body.put("redirectUrl", config.redirectUrl());
        body.put("ipnUrl", config.ipnUrl());
        body.put("requestType", "captureWallet");
        body.put("extraData", "");
        body.put("autoCapture", true);
        body.put("lang", "vi");
        body.put("signature", sign(config.secretKey(), "accessKey=" + config.accessKey()
                + "&amount=" + attempt.amount() + "&extraData=&ipnUrl=" + config.ipnUrl()
                + "&orderId=" + attempt.orderId() + "&orderInfo=" + attempt.orderInfo()
                + "&partnerCode=" + config.partnerCode() + "&redirectUrl=" + config.redirectUrl()
                + "&requestId=" + attempt.orderId() + "&requestType=captureWallet"));
        JsonNode response = post("/v2/gateway/api/create", body);
        validateIdentity(response, attempt, attempt.orderId(), false);
        return response;
    }

    public JsonNode query(MomoPaymentStore.Attempt attempt) {
        config.requireCredentials();
        String requestId = UUID.randomUUID().toString();
        Map<String, Object> body = Map.of("partnerCode", config.partnerCode(), "requestId", requestId,
                "orderId", attempt.orderId(), "lang", "vi", "signature",
                sign(config.secretKey(), "accessKey=" + config.accessKey() + "&orderId=" + attempt.orderId()
                        + "&partnerCode=" + config.partnerCode() + "&requestId=" + requestId));
        JsonNode response = post("/v2/gateway/api/query", body);
        validateIdentity(response, attempt, requestId, true);
        return response;
    }

    public void verifyNotification(JsonNode body) {
        config.requireCredentials();
        String[] fields = {"amount", "extraData", "message", "orderId", "orderInfo", "orderType",
                "partnerCode", "payType", "requestId", "responseTime", "resultCode", "transId"};
        StringBuilder raw = new StringBuilder("accessKey=").append(config.accessKey());
        for (String field : fields) {
            if (!body.hasNonNull(field) || !body.get(field).isValueNode()) throw invalidNotification();
            raw.append('&').append(field).append('=').append(body.get(field).asText());
        }
        String signature = body.path("signature").asText("");
        if (!signature.matches("[a-fA-F0-9]{64}")
                || !MessageDigest.isEqual(HexFormat.of().parseHex(signature),
                    HexFormat.of().parseHex(sign(config.secretKey(), raw.toString())))
                || !config.partnerCode().equals(body.path("partnerCode").asText())
                || !body.path("amount").isIntegralNumber() || !body.path("amount").canConvertToLong()
                || !body.path("resultCode").isIntegralNumber() || !body.path("resultCode").canConvertToInt()) {
            throw invalidNotification();
        }
    }

    public String paymentUrl(JsonNode response) {
        try {
            URI uri = URI.create(response.path("payUrl").asText());
            if (!"https".equals(uri.getScheme()) || !"test-payment.momo.vn".equals(uri.getHost())
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) {
                throw new IllegalArgumentException();
            }
            return uri.toString();
        } catch (IllegalArgumentException e) {
            throw unavailable("MoMo sandbox trả về đường dẫn thanh toán không hợp lệ.");
        }
    }

    private JsonNode post(String path, Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            JsonNode response = http.postForObject(BASE_URL + path, new HttpEntity<>(body, headers), JsonNode.class);
            if (response == null || !response.path("resultCode").isIntegralNumber()
                    || !response.path("resultCode").canConvertToInt()) throw unavailable("Phản hồi MoMo sandbox không hợp lệ.");
            return response;
        } catch (RestClientException e) {
            // Never include request/response bodies or credentials in logs/errors.
            throw unavailable("Chưa nhận được kết quả từ MoMo sandbox. Hãy kiểm tra trạng thái trước khi thử lại.");
        }
    }

    private void validateIdentity(JsonNode response, MomoPaymentStore.Attempt attempt, String requestId, boolean amountRequired) {
        if (!config.partnerCode().equals(response.path("partnerCode").asText())
                || !attempt.orderId().equals(response.path("orderId").asText())
                || !requestId.equals(response.path("requestId").asText())
                || ((amountRequired || response.has("amount")) && (!response.path("amount").isIntegralNumber()
                    || !response.path("amount").canConvertToLong() || response.path("amount").asLong() != attempt.amount()))) {
            throw unavailable("Thông tin giao dịch do MoMo trả về không khớp.");
        }
    }

    static String sign(String secret, String raw) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable");
        }
    }

    private ResponseStatusException invalidNotification() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông báo MoMo không hợp lệ.");
    }
    private ResponseStatusException unavailable(String message) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message);
    }
}
