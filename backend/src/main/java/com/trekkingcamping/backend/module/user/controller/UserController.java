package com.trekkingcamping.backend.module.user.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<UserResponseDto>> getAllUsers() {
        List<UserResponseDto> users = userService.getAllUsers();
        ApiResponse<List<UserResponseDto>> response = new ApiResponse<>();
        response.setData(users);
        return response;
    }
}