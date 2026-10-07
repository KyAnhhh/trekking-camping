package com.trekkingcamping.backend.module.auth.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.auth.service.AccountRecoveryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AccountRecoveryController {
    private final AccountRecoveryService service;
    public AccountRecoveryController(AccountRecoveryService service) { this.service = service; }
    public record ForgotRequest(String email) {}
    public record ResetRequest(String token, String password) {}
    @PostMapping("/forgot-password")
    public ApiResponse<String> forgot(@RequestBody ForgotRequest request) {
        service.forgotPassword(request.email());
        return new ApiResponse<>(1000, "Yêu cầu đã được tiếp nhận.", "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.");
    }
    @PostMapping("/reset-password")
    public ApiResponse<Void> reset(@RequestBody ResetRequest request) {
        service.resetPassword(request.token(), request.password());
        return new ApiResponse<>(1000, "Đã đổi mật khẩu. Vui lòng đăng nhập lại.", null);
    }
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@AuthenticationPrincipal String email) {
        service.logout(email);
        return new ApiResponse<>(1000, "Đã đăng xuất các phiên của tài khoản.", null);
    }
}
