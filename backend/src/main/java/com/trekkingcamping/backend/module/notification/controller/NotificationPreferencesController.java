package com.trekkingcamping.backend.module.notification.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.notification.service.NotificationPreferences;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController @RequestMapping("/api/notifications/preferences")
public class NotificationPreferencesController {
 public record Preference(Boolean emailEnabled) {}
 private final NotificationPreferences service;
 public NotificationPreferencesController(NotificationPreferences s){service=s;}
 @GetMapping public ApiResponse<?> get(@AuthenticationPrincipal String email){return new ApiResponse<>(1000,"Thành công",new Preference(service.get(email)));}
 @PutMapping public ApiResponse<?> save(@AuthenticationPrincipal String email,@RequestBody Preference p){if(p.emailEnabled()==null)throw new IllegalArgumentException("Thiếu tùy chọn email.");service.save(email,p.emailEnabled());return get(email);}
}
