package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.guide.service.GuideInvitationService;
import com.trekkingcamping.backend.module.chat.service.ChatRateLimit;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class GuideInvitationController {
    private final GuideInvitationService service;
    private final ChatRateLimit limits;
    public GuideInvitationController(GuideInvitationService service, ChatRateLimit limits) {this.service=service;this.limits=limits;}
    public record Token(String token) {}
    @GetMapping("/api/admin/guides/{id}/invitation")
    public ApiResponse<?> status(@AuthenticationPrincipal String email,@PathVariable Long id) {return ok(service.status(email,id));}
    @PostMapping("/api/admin/guides/{id}/invitation")
    public ApiResponse<?> send(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody GuideInvitationService.Invite input) {return ok(service.send(email,id,input));}
    @DeleteMapping("/api/admin/guides/{id}/invitation")
    public ApiResponse<?> revoke(@AuthenticationPrincipal String email,@PathVariable Long id) {service.revoke(email,id);return ok(null);}
    @PostMapping("/api/guide-invitations/preview")
    public ApiResponse<?> preview(@RequestBody Token input,HttpServletRequest request) {limits.check(request.getRemoteAddr(),"guide-invitation",30);return ok(service.preview(input.token()));}
    @PostMapping("/api/guide-invitations/accept")
    public ApiResponse<?> accept(@RequestBody GuideInvitationService.Acceptance input,HttpServletRequest request) {limits.check(request.getRemoteAddr(),"guide-invitation",30);service.accept(input);return ok(null);}
    private static <T> ApiResponse<T> ok(T data) {return new ApiResponse<>(1000,"Thành công",data);}
}
