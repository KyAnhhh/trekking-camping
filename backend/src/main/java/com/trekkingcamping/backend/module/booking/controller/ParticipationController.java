package com.trekkingcamping.backend.module.booking.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.ParticipationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
public class ParticipationController {
    private final ParticipationService service;
    public ParticipationController(ParticipationService service) { this.service=service; }
    @GetMapping("/api/bookings/{id}/participation") public ApiResponse<ParticipationService.View> get(@AuthenticationPrincipal String email,@PathVariable Long id) { return ok(service.get(email,id,false)); }
    @GetMapping("/api/admin/bookings/{id}/participation") public ApiResponse<ParticipationService.View> admin(@AuthenticationPrincipal String email,@PathVariable Long id) { return ok(service.get(email,id,true)); }
    @PutMapping("/api/bookings/{id}/participation") public ApiResponse<ParticipationService.View> submit(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody ParticipationService.Submission body) { return ok(service.submit(email,id,body)); }
    @PostMapping("/api/admin/bookings/{id}/participation/review") public ApiResponse<ParticipationService.View> review(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody ParticipationService.Review body) { return ok(service.review(email,id,body)); }
    @DeleteMapping("/api/bookings/{id}/participation") public ApiResponse<Void> delete(@AuthenticationPrincipal String email,@PathVariable Long id) { service.delete(email,id); return ok(null); }
    private <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(1000,"Thành công",data); }
}
