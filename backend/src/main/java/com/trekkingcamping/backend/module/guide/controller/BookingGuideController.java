package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.guide.dto.GuideDtos.BookingTeam;
import com.trekkingcamping.backend.module.guide.service.GuideService;
import com.trekkingcamping.backend.module.booking.service.BookingManagementService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
public class BookingGuideController {
    private final BookingManagementService bookings;
    private final GuideService guides;
    public BookingGuideController(BookingManagementService bookings, GuideService guides) { this.bookings = bookings; this.guides = guides; }
    @GetMapping("/api/bookings/{id}/guides")
    public ApiResponse<BookingTeam> client(@PathVariable Long id, @AuthenticationPrincipal String email) { return team(id, email, false); }
    @GetMapping("/api/admin/bookings/{id}/guides")
    public ApiResponse<BookingTeam> admin(@PathVariable Long id, @AuthenticationPrincipal String email) { return team(id, email, true); }
    private ApiResponse<BookingTeam> team(Long id, String email, boolean admin) {
        var booking = bookings.getDetail(email, id, admin).booking(); // Owner/admin checked before accessing the team.
        return new ApiResponse<>(1000, "Thành công", guides.bookingTeam(booking.scheduleId(), admin || "CONFIRMED".equals(booking.status())));
    }
}
