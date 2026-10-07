package com.trekkingcamping.backend.module.booking.dto;

import java.util.List;

public record BookingDetailDto(BookingResponseDto booking, String contactName, String contactEmail,
                               String contactPhone, List<PaymentResponseDto> payments,
                               boolean canCancel, boolean canConfirm) {}
