package com.trekkingcamping.backend.module.booking.dto;

import java.util.List;

public record BookingDetailDto(BookingResponseDto booking, String contactName, String contactEmail,
                               String contactPhone, List<PaymentResponseDto> payments,
                               boolean canCancel, boolean canConfirm, String participationStatus, java.time.LocalDateTime participationDeadline) {
    public BookingDetailDto(BookingResponseDto b,String name,String email,String phone,List<PaymentResponseDto> payments,boolean cancel,boolean confirm) {
        this(b,name,email,phone,payments,cancel,confirm,null,null);
    }
}
