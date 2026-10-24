package com.trekkingcamping.backend.module.booking.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.service.TripPreparationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController @RequestMapping("/api/bookings/{id}/preparation")
public class TripPreparationController {
 public record Input(String label,Boolean checked) {}
 private final TripPreparationService service;
 public TripPreparationController(TripPreparationService s){service=s;}
 @GetMapping public ApiResponse<?> get(@AuthenticationPrincipal String email,@PathVariable Long id){return ok(service.get(email,id));}
 @PostMapping public ApiResponse<?> add(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody Input input){service.add(email,id,input.label());return ok(null);}
 @PutMapping("/{key}") public ApiResponse<?> check(@AuthenticationPrincipal String email,@PathVariable Long id,@PathVariable String key,@RequestBody Input input){service.check(email,id,key,input.checked());return ok(null);}
 @DeleteMapping("/{key}") public ApiResponse<?> remove(@AuthenticationPrincipal String email,@PathVariable Long id,@PathVariable String key){service.remove(email,id,key);return ok(null);}
 private ApiResponse<?> ok(Object value){return new ApiResponse<>(1000,"Thành công",value);}
}
