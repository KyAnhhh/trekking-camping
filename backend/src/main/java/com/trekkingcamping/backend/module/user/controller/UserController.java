package com.trekkingcamping.backend.module.user.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.service.UserService;
import com.trekkingcamping.backend.module.user.service.AdminUserService;
import java.security.Principal;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final AdminUserService adminUsers;

    public UserController(UserService userService, AdminUserService adminUsers) {
        this.userService = userService;
        this.adminUsers = adminUsers;
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponseDto> update(Principal actor, @PathVariable Long id, @RequestBody AdminUserService.Edit input) {
        return new ApiResponse<>(200, "Đã cập nhật người dùng.", adminUsers.update(actor.getName(), id, input));
    }

    @PutMapping("/{id}/active")
    public ApiResponse<UserResponseDto> activate(Principal actor, @PathVariable Long id, @RequestBody AdminUserService.Activation input) {
        return new ApiResponse<>(200, "Đã cập nhật trạng thái tài khoản.", adminUsers.activate(actor.getName(), id, input));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Principal actor, @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime updatedAt) {
        adminUsers.delete(actor.getName(), id, updatedAt);
        return new ApiResponse<>(200, "Đã xóa tài khoản.", null);
    }

    @GetMapping
    public ApiResponse<List<UserResponseDto>> getAllUsers() {
        List<UserResponseDto> users = userService.getAllUsers();
        ApiResponse<List<UserResponseDto>> response = new ApiResponse<>();
        response.setData(users);
        return response;
    }
}
