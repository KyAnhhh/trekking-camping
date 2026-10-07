package com.trekkingcamping.backend.module.auth.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.user.dto.LoginRequestDto;
import com.trekkingcamping.backend.module.user.dto.LoginResponseDto;
import com.trekkingcamping.backend.module.user.dto.UserRegisterRequestDto;
import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ApiResponse<UserResponseDto> register(@RequestBody UserRegisterRequestDto request) {
        UserResponseDto userResponse = userService.registerUser(request);
        ApiResponse<UserResponseDto> response = new ApiResponse<>();
        response.setData(userResponse);
        return response;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponseDto> login(@RequestBody LoginRequestDto request) {
        LoginResponseDto loginResponse = userService.login(request);
        ApiResponse<LoginResponseDto> response = new ApiResponse<>();
        response.setData(loginResponse);
        return response;
    }
}