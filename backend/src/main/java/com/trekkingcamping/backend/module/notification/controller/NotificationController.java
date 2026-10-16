package com.trekkingcamping.backend.module.notification.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) {this.service=service;}
    @GetMapping public ApiResponse<?> list(@AuthenticationPrincipal String email,@RequestParam(defaultValue="0") int page) { return ok(service.inbox(email,page)); }
    @GetMapping("/unread-count") public ApiResponse<?> count(@AuthenticationPrincipal String email) {return ok(service.unread(email));}
    @PutMapping("/{id}/read") public ApiResponse<?> read(@AuthenticationPrincipal String email,@PathVariable Long id) {service.read(email,id);return ok(null);}
    @PutMapping("/read-all") public ApiResponse<?> all(@AuthenticationPrincipal String email) {service.readAll(email);return ok(null);}
    private static <T> ApiResponse<T> ok(T value) {return new ApiResponse<>(1000,"Thành công",value);}
}
