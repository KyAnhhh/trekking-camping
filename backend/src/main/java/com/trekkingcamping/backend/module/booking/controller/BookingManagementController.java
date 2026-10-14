package com.trekkingcamping.backend.module.booking.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.dto.BookingDetailDto;
import com.trekkingcamping.backend.module.booking.service.BookingManagementService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class BookingManagementController {
    private final BookingManagementService service;
    public BookingManagementController(BookingManagementService service) { this.service = service; }

    @GetMapping("/api/bookings/{id}")
    public ApiResponse<BookingDetailDto> detail(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.getDetail(email, id, false));
    }

    @PostMapping("/api/bookings/{id}/cancel")
    public ApiResponse<BookingDetailDto> cancel(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.cancel(email, id, false));
    }

    @GetMapping("/api/admin/bookings")
    public ApiResponse<List<BookingDetailDto>> list(@AuthenticationPrincipal String email) {
        return response(service.listForAdmin(email));
    }

    @GetMapping("/api/admin/bookings/{id}")
    public ApiResponse<BookingDetailDto> adminDetail(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.getDetail(email, id, true));
    }

    @PostMapping("/api/admin/bookings/{id}/cancel")
    public ApiResponse<BookingDetailDto> adminCancel(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.cancel(email, id, true));
    }

    @PostMapping("/api/admin/bookings/{id}/confirm")
    public ApiResponse<BookingDetailDto> confirm(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.confirm(email, id));
    }

    @PostMapping("/api/admin/bookings/{id}/complete")
    public ApiResponse<BookingDetailDto> complete(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return response(service.complete(email, id));
    }

    private <T> ApiResponse<T> response(T data) {
        ApiResponse<T> result = new ApiResponse<>();
        result.setData(data);
        return result;
    }
}
