package com.trekkingcamping.backend.module.booking.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.BookingChangeService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
public class BookingChangeController {
 private final BookingChangeService service;
 public BookingChangeController(BookingChangeService service){this.service=service;}
 @GetMapping("/api/bookings/{id}/change-requests") public ApiResponse<?> history(@AuthenticationPrincipal String email,@PathVariable Long id){return ok(service.history(email,id,false));}
 @PostMapping("/api/bookings/{id}/change-requests") public ApiResponse<?> create(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody BookingChangeService.Create body){return ok(service.create(email,id,body));}
 @GetMapping("/api/admin/booking-change-requests") public ApiResponse<?> queue(@AuthenticationPrincipal String email,@RequestParam(defaultValue="0") int page){return ok(service.queue(email,page));}
 @GetMapping("/api/admin/bookings/{id}/change-requests") public ApiResponse<?> adminHistory(@AuthenticationPrincipal String email,@PathVariable Long id){return ok(service.history(email,id,true));}
 @PutMapping("/api/admin/bookings/{id}/change-requests/{requestId}") public ApiResponse<?> decide(@AuthenticationPrincipal String email,@PathVariable Long id,@PathVariable Long requestId,@RequestBody BookingChangeService.Decision body){return ok(service.decide(email,id,requestId,body));}
 private ApiResponse<?> ok(Object data){return new ApiResponse<>(1000,"Thành công",data);}
}
