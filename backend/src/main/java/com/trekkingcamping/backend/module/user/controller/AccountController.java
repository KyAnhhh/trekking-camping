package com.trekkingcamping.backend.module.user.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.user.service.AccountService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account")
public class AccountController {
    private final AccountService service;
    public AccountController(AccountService service) { this.service = service; }
    @GetMapping public ApiResponse<AccountService.Profile> me(@AuthenticationPrincipal String email) {
        return new ApiResponse<>(1000, "Thành công", service.me(email));
    }
    @PutMapping public ApiResponse<AccountService.Profile> update(@AuthenticationPrincipal String email, @RequestBody AccountService.Edit input) {
        return new ApiResponse<>(1000, "Đã cập nhật hồ sơ", service.update(email, input));
    }
    @PostMapping("/password") public ApiResponse<Void> password(@AuthenticationPrincipal String email, @RequestBody AccountService.ChangePassword input) {
        service.changePassword(email, input);
        return new ApiResponse<>(1000, "Đã đổi mật khẩu. Vui lòng đăng nhập lại.", null);
    }
}
