package com.trekkingcamping.backend.module.booking.controller;

import com.trekkingcamping.backend.module.booking.dto.BookingRequestDto;
import com.trekkingcamping.backend.module.booking.dto.BookingResponseDto;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.BookingService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ApiResponse<BookingResponseDto> createBooking(
            @AuthenticationPrincipal String email,
            @RequestBody BookingRequestDto dto) {
        ApiResponse<BookingResponseDto> response = new ApiResponse<>();
        response.setData(bookingService.createBooking(email, dto));   
        return response;
    }

    @GetMapping("/my-bookings")
    public ApiResponse<List<BookingResponseDto>> getMyBookings(@AuthenticationPrincipal String email) {
        ApiResponse<List<BookingResponseDto>> response = new ApiResponse<>();
        response.setData(bookingService.getUserBookings(email));
        return response;
    }
}
