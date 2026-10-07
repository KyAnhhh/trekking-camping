package com.trekkingcamping.backend.module.booking.dto;

import com.trekkingcamping.backend.module.booking.entity.PaymentTransaction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponseDto(Long id, String transactionCode, String paymentMethod,
                                 BigDecimal amount, String status, LocalDateTime paidAt) {
    public static PaymentResponseDto from(PaymentTransaction payment) {
        return new PaymentResponseDto(payment.getId(), payment.getTransactionCode(),
                payment.getPaymentMethod(), payment.getAmount(), payment.getStatus(), payment.getPaidAt());
    }
}
