package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.guide.service.GuideWorkspaceService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
public class GuideWorkspaceController {
    private final GuideWorkspaceService service;
    public GuideWorkspaceController(GuideWorkspaceService service) {this.service=service;}
    @GetMapping("/api/admin/guides/{id}/account") public ApiResponse<?> account(@AuthenticationPrincipal String email,@PathVariable Long id) {return ok(service.account(email,id));}
    @PutMapping("/api/admin/guides/{id}/account") public ApiResponse<?> link(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody GuideWorkspaceService.LinkAccount input) {return ok(service.link(email,id,input));}
    @GetMapping("/api/guide-workspace/trips") public ApiResponse<?> trips(@AuthenticationPrincipal String email,@RequestParam(defaultValue="0") int page) {return ok(service.trips(email,page));}
    @GetMapping("/api/guide-workspace/trips/{id}") public ApiResponse<?> roster(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestParam(defaultValue="0") int page) {return ok(service.roster(email,id,page));}
    @PutMapping("/api/guide-workspace/trips/{id}/bookings/{bookingId}/attendance") public ApiResponse<?> attendance(@AuthenticationPrincipal String email,@PathVariable Long id,@PathVariable Long bookingId,@RequestBody GuideWorkspaceService.CheckIn input) {service.checkIn(email,id,bookingId,input);return ok(null);}
    private static <T> ApiResponse<T> ok(T value) {return new ApiResponse<>(1000,"Thành công",value);}
}
