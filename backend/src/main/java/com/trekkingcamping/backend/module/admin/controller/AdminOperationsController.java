package com.trekkingcamping.backend.module.admin.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.admin.service.AdminOperationsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/admin/operations")
public class AdminOperationsController {
    private final AdminOperationsService service;
    public AdminOperationsController(AdminOperationsService service) { this.service=service; }
    @GetMapping("/overview") public ApiResponse<?> overview(@AuthenticationPrincipal String email) { return ok(service.overview(email)); }
    @GetMapping("/bookings") public ApiResponse<?> bookings(@AuthenticationPrincipal String email,@RequestParam(defaultValue="ALL") String queue,@RequestParam(defaultValue="0") int page) { return ok(service.bookings(email,queue,page)); }
    @GetMapping("/payments") public ApiResponse<?> payments(@AuthenticationPrincipal String email,@RequestParam(defaultValue="PENDING") String status,@RequestParam(defaultValue="0") int page) { return ok(service.payments(email,status,page)); }
    @PostMapping("/payments/{id}/reconcile") public ApiResponse<?> reconcile(@AuthenticationPrincipal String email,@PathVariable Long id,HttpServletRequest request) { return ok(service.reconcile(email,id,request.getRemoteAddr())); }
    @PostMapping("/payments/{id}/resolve") public ApiResponse<?> resolve(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody AdminOperationsService.ResolveInput input) { return ok(service.resolve(email,id,input)); }
    @GetMapping("/reviews") public ApiResponse<?> reviews(@AuthenticationPrincipal String email,@RequestParam(defaultValue="ALL") String visibility,@RequestParam(defaultValue="0") int page) { return ok(service.reviews(email,visibility,page)); }
    @PutMapping("/reviews/{id}/visibility") public ApiResponse<?> moderate(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody AdminOperationsService.Moderation input) { return ok(service.moderate(email,id,input)); }
    private static <T> ApiResponse<T> ok(T value) { return new ApiResponse<>(1000,"Thành công",value); }
}
