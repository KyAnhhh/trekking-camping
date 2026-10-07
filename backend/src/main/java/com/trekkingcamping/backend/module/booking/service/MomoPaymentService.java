package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.trekkingcamping.backend.config.MomoProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MomoPaymentService {
    private final MomoProperties config;
    private final MomoPaymentStore store;
    private final MomoGateway gateway;
    public record Checkout(Long bookingId, String orderId, String status, String payUrl) {}

    public MomoPaymentService(MomoProperties config, MomoPaymentStore store, MomoGateway gateway) {
        this.config = config; this.store = store; this.gateway = gateway;
    }

    public Checkout start(String email, Long bookingId) {
        config.requireCheckout(); // Missing config must not leave an unusable pending transaction.
        var attempt = store.prepare(email, bookingId);
        JsonNode response = gateway.create(attempt);
        int code = response.path("resultCode").asInt();
        if (code != 0) {
            if (code == 40 || code == 41 || code == 9000) return refresh(email, attempt.orderId());
            store.applyResult(attempt.orderId(), attempt.amount(), code, null, null);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "MoMo sandbox chưa tạo được phiên thanh toán (mã " + code + "). Hãy kiểm tra trạng thái hoặc liên hệ quản trị viên.");
        }
        // Creation succeeded, but payment has not happened yet.
        return new Checkout(attempt.bookingId(), attempt.orderId(), "PENDING", gateway.paymentUrl(response));
    }

    public Checkout refresh(String email, String orderId) {
        var attempt = store.getForUser(email, orderId);
        if ("SUCCESS".equals(attempt.status()) || "REFUND_REQUIRED".equals(attempt.status())) return checkout(attempt);
        JsonNode response = gateway.query(attempt);
        return checkout(store.applyResult(orderId, attempt.amount(), response.path("resultCode").asInt(), null, null));
    }

    public void notification(JsonNode body) {
        gateway.verifyNotification(body);
        store.applyResult(body.path("orderId").asText(), body.path("amount").asLong(),
                body.path("resultCode").asInt(), body.path("requestId").asText(), body.path("orderInfo").asText());
    }

    private Checkout checkout(MomoPaymentStore.Attempt attempt) {
        return new Checkout(attempt.bookingId(), attempt.orderId(), attempt.status(), null);
    }
}
