package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.config.VnpayProperties;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class VnpayPaymentService {
    private static final String METHOD = "VNPAY_SANDBOX";
    private final VnpayProperties config;
    private final MomoPaymentStore store;
    private final VnpayGateway gateway;
    private final VnpayQueryClient queryClient;
    public record Checkout(Long bookingId, String orderId, String status, String paymentUrl) {}
    public VnpayPaymentService(VnpayProperties config, MomoPaymentStore store, VnpayGateway gateway, VnpayQueryClient queryClient) {
        this.config = config; this.store = store; this.gateway = gateway;
        this.queryClient = queryClient;
    }
    public Checkout start(String email, Long bookingId, String clientIp) {
        config.requireCheckout();
        var attempt = store.prepare(email, bookingId, METHOD);
        if (gateway.expired(attempt.orderId())) {
            var resolved = reconcile(attempt, clientIp);
            if ("SUCCESS".equals(resolved.status()) || "REFUND_REQUIRED".equals(resolved.status())) return resolved;
            if (!java.util.Set.of("FAILED", "EXPIRED").contains(resolved.status())) throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "VNPAY vẫn đang xử lý giao dịch cũ. Chưa thể tạo thanh toán mới; hãy kiểm tra lại sau.");
            // New transaction rechecks booking/amount/status under the same booking row lock.
            attempt = store.prepare(email, bookingId, METHOD);
        }
        return new Checkout(attempt.bookingId(), attempt.orderId(), attempt.status(), gateway.paymentUrl(attempt, clientIp));
    }
    public Checkout status(String email, String orderId) { return checkout(store.getForUser(email, orderId, METHOD)); }
    public Checkout refresh(String email, String orderId, String clientIp) {
        var attempt = store.getForUser(email, orderId, METHOD);
        return "PENDING".equals(attempt.status()) ? reconcile(attempt, clientIp) : checkout(attempt);
    }
    private Checkout reconcile(MomoPaymentStore.Attempt attempt, String ip) {
        var result = queryClient.query(attempt, ip);
        if (result.expired()) return checkout(store.expireVnpay(result.orderId(), result.amount(), result.orderInfo()));
        return checkout(store.applyVnpayResult(result.orderId(), result.amount(), result.success(), result.failed(), result.orderInfo()));
    }
    public Checkout returned(Map<String, String[]> params) {
        var result = gateway.verify(params);
        return checkout(store.applyVnpayResult(result.orderId(), result.amount(), result.success(), result.failed(), result.orderInfo()));
    }
    private Checkout checkout(MomoPaymentStore.Attempt attempt) { return new Checkout(attempt.bookingId(), attempt.orderId(), attempt.status(), null); }
}
