package com.trekkingcamping.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;

@Component
public class MomoProperties {
    @Value("${MOMO_PARTNER_CODE:}") private String partnerCode = "";
    @Value("${MOMO_ACCESS_KEY:}") private String accessKey = "";
    @Value("${MOMO_SECRET_KEY:}") private String secretKey = "";
    @Value("${MOMO_REDIRECT_URL:http://localhost:5173/payment/momo/return}")
    private String redirectUrl = "http://localhost:5173/payment/momo/return";
    @Value("${MOMO_IPN_URL:}") private String ipnUrl = "";

    public String partnerCode() { return partnerCode.trim(); }
    public String accessKey() { return accessKey.trim(); }
    public String secretKey() { return secretKey.trim(); }
    public String redirectUrl() { return redirectUrl.trim(); }
    public String ipnUrl() { return ipnUrl.trim(); }

    public void requireCredentials() {
        if (partnerCode().isEmpty() || accessKey().isEmpty() || secretKey().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "MoMo sandbox chưa được cấu hình tài khoản merchant. Vui lòng liên hệ quản trị viên.");
        }
    }

    public void requireCheckout() {
        requireCredentials();
        try {
            URI redirect = URI.create(redirectUrl());
            URI ipn = URI.create(ipnUrl());
            if (redirect.getHost() == null || redirect.getUserInfo() != null
                    || !java.util.Set.of("http", "https").contains(redirect.getScheme())
                    || ipn.getHost() == null || ipn.getUserInfo() != null || !"https".equals(ipn.getScheme())
                    || "localhost".equalsIgnoreCase(ipn.getHost()) || ipn.getHost().equals("127.0.0.1")) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Cần cấu hình URL quay về và URL HTTPS công khai nhận kết quả MoMo sandbox.");
        }
    }
}
