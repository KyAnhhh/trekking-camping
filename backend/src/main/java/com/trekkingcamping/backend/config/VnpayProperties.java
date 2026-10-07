package com.trekkingcamping.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;

@Component
@ConfigurationProperties(prefix = "vnpay")
public class VnpayProperties {
    private String tmnCode = "";
    private String hashSecret = "";
    private String paymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private String returnUrl = "http://localhost:8080/api/payments/vnpay/return";
    private String frontendUrl = "http://localhost:5173";
    public String getTmnCode() { return tmnCode == null ? "" : tmnCode.trim(); }
    public void setTmnCode(String value) { tmnCode = value; }
    public String getHashSecret() { return hashSecret == null ? "" : hashSecret.trim(); }
    public void setHashSecret(String value) { hashSecret = value; }
    public String getPaymentUrl() { return paymentUrl == null ? "" : paymentUrl.trim(); }
    public void setPaymentUrl(String value) { paymentUrl = value; }
    public String getReturnUrl() { return returnUrl == null ? "" : returnUrl.trim(); }
    public void setReturnUrl(String value) { returnUrl = value; }
    public String getFrontendUrl() { return frontendUrl == null ? "" : frontendUrl.trim().replaceAll("/+$", ""); }
    public void setFrontendUrl(String value) { frontendUrl = value; }

    public void requireCredentials() {
        if (!getTmnCode().matches("[A-Za-z0-9]{8}") || getHashSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "VNPAY Sandbox chưa có cấu hình merchant hợp lệ. Kiểm tra VNPAY_TMN_CODE và VNPAY_HASH_SECRET.");
        }
    }
    public void requireCheckout() {
        requireCredentials();
        try {
            if (!"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html".equals(getPaymentUrl())) throw new IllegalArgumentException();
            URI callback = URI.create(getReturnUrl()), frontend = URI.create(getFrontendUrl());
            if (!validWebUrl(callback) || !validWebUrl(frontend)
                    || !"/api/payments/vnpay/return".equals(callback.getPath())
                    || getReturnUrl().length() > 255) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Cấu hình URL VNPAY Sandbox không hợp lệ. Kiểm tra VNPAY_PAYMENT_URL, VNPAY_RETURN_URL và APP_FRONTEND_URL.");
        }
    }
    private boolean validWebUrl(URI uri) {
        return uri.getHost() != null && uri.getUserInfo() == null && uri.getQuery() == null && uri.getFragment() == null
                && ("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme())
                && java.util.Set.of("localhost", "127.0.0.1", "[::1]").contains(uri.getHost())));
    }
}
