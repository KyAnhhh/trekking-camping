package com.trekkingcamping.backend.module.booking.dto;

import com.trekkingcamping.backend.module.booking.entity.Booking;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record BookingResponseDto(Long id, String bookingCode, String tourTitle, String tourSlug,
        Long scheduleId, LocalDate departureDate, LocalDate returnDate, Integer numberOfPax,
        BigDecimal totalAmount, String status, LocalDateTime createdAt) {
    public static BookingResponseDto from(Booking booking) {
        var schedule = booking.getSchedule();
        var tour = schedule.getTour();
        return new BookingResponseDto(booking.getId(), booking.getBookingCode(), tour.getTitle(),
                tour.getSlug(), schedule.getId(), schedule.getDepartureDate(), schedule.getReturnDate(),
                booking.getNumberOfPax(), booking.getTotalAmount(), booking.getStatus(), booking.getCreatedAt());
    }
}
