package com.trekkingcamping.backend.module.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.MomoPaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/momo")
public class MomoPaymentController {
    private final MomoPaymentService service;
    public MomoPaymentController(MomoPaymentService service) { this.service = service; }
    public record StartRequest(Long bookingId) {}

    @PostMapping("/start")
    public ApiResponse<MomoPaymentService.Checkout> start(@AuthenticationPrincipal String email,
                                                         @RequestBody StartRequest request) {
        if (request.bookingId() == null || request.bookingId() <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Mã đơn đặt tour không hợp lệ.");
        }
        return response(service.start(email, request.bookingId()));
    }
    @PostMapping("/{orderId}/refresh")
    public ApiResponse<MomoPaymentService.Checkout> refresh(@AuthenticationPrincipal String email, @PathVariable String orderId) {
        return response(service.refresh(email, orderId));
    }
    @PostMapping("/ipn")
    public ResponseEntity<Void> notification(@RequestBody JsonNode body) {
        service.notification(body);
        return ResponseEntity.noContent().build();
    }
    private <T> ApiResponse<T> response(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setData(data);
        return response;
    }
}
