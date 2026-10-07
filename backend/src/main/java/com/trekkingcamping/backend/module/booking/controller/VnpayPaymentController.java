package com.trekkingcamping.backend.module.booking.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.config.VnpayProperties;
import com.trekkingcamping.backend.module.booking.service.VnpayPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;

@RestController
@RequestMapping("/api/payments/vnpay")
public class VnpayPaymentController {
    private final VnpayPaymentService service;
    private final VnpayProperties config;
    public VnpayPaymentController(VnpayPaymentService service, VnpayProperties config) { this.service = service; this.config = config; }
    public record StartRequest(Long bookingId) {}
    @PostMapping("/start")
    public ApiResponse<VnpayPaymentService.Checkout> start(@AuthenticationPrincipal String email,
            @RequestBody StartRequest body, HttpServletRequest request) {
        if (body.bookingId() == null || body.bookingId() <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã đơn đặt tour không hợp lệ.");
        return new ApiResponse<>(1000, "Thành công", service.start(email, body.bookingId(), request.getRemoteAddr()));
    }
    @GetMapping("/{orderId}/status")
    public ApiResponse<VnpayPaymentService.Checkout> status(@AuthenticationPrincipal String email, @PathVariable String orderId) {
        return new ApiResponse<>(1000, "Thành công", service.status(email, orderId));
    }
    @PostMapping("/{orderId}/refresh")
    public ApiResponse<VnpayPaymentService.Checkout> refresh(@AuthenticationPrincipal String email, @PathVariable String orderId, HttpServletRequest request) {
        return new ApiResponse<>(1000, "Thành công", service.refresh(email, orderId, request.getRemoteAddr()));
    }
    @GetMapping("/return")
    public ResponseEntity<Void> returned(HttpServletRequest request) {
        config.requireCheckout(); // Validate the configured redirect, never accept a URL from query params.
        var result = service.returned(request.getParameterMap());
        return ResponseEntity.status(HttpStatus.SEE_OTHER)
                .header("Referrer-Policy", "no-referrer").cacheControl(CacheControl.noStore())
                .location(URI.create(config.getFrontendUrl() + "/payment/vnpay/return?orderId=" + result.orderId())).build();
    }
}
