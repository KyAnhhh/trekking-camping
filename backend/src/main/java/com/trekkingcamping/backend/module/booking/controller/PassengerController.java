package com.trekkingcamping.backend.module.booking.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.PassengerService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class PassengerController {
    private final PassengerService service;
    public PassengerController(PassengerService service) {this.service=service;}
    @GetMapping("/api/bookings/{id}/passengers") public ApiResponse<?> owner(@AuthenticationPrincipal String email,@PathVariable Long id) {return ok(service.ownerRoster(email,id,false));}
    @PutMapping("/api/bookings/{id}/passengers") public ApiResponse<?> saveOwner(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody PassengerService.Names input) {return ok(service.saveNames(email,id,false,input));}
    @GetMapping("/api/admin/bookings/{id}/passengers") public ApiResponse<?> admin(@AuthenticationPrincipal String email,@PathVariable Long id) {return ok(service.ownerRoster(email,id,true));}
    @PutMapping("/api/admin/bookings/{id}/passengers") public ApiResponse<?> saveAdmin(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody PassengerService.Names input) {return ok(service.saveNames(email,id,true,input));}
    @GetMapping("/api/bookings/{id}/passengers/history") public ApiResponse<?> ownerHistory(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestParam(defaultValue="0") int page) {return ok(service.ownerHistory(email,id,false,page));}
    @GetMapping("/api/admin/bookings/{id}/passengers/history") public ApiResponse<?> adminHistory(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestParam(defaultValue="0") int page) {return ok(service.ownerHistory(email,id,true,page));}
    @GetMapping("/api/guide-workspace/trips/{scheduleId}/bookings/{id}/passengers") public ApiResponse<?> guide(@AuthenticationPrincipal String email,@PathVariable Long scheduleId,@PathVariable Long id) {return ok(service.guideRoster(email,scheduleId,id));}
    @PutMapping("/api/guide-workspace/trips/{scheduleId}/bookings/{id}/passengers/{passengerId}/attendance") public ApiResponse<?> mark(@AuthenticationPrincipal String email,@PathVariable Long scheduleId,@PathVariable Long id,@PathVariable Long passengerId,@RequestBody PassengerService.Mark input) {return ok(service.mark(email,scheduleId,id,passengerId,input));}
    @GetMapping("/api/guide-workspace/trips/{scheduleId}/bookings/{id}/passengers/history") public ApiResponse<?> guideHistory(@AuthenticationPrincipal String email,@PathVariable Long scheduleId,@PathVariable Long id,@RequestParam(defaultValue="0") int page) {return ok(service.guideHistory(email,scheduleId,id,page));}
    private static <T> ApiResponse<T> ok(T data) {return new ApiResponse<>(1000,"Thành công",data);}
}
