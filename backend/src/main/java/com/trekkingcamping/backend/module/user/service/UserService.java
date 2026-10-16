package com.trekkingcamping.backend.module.user.service;

import com.trekkingcamping.backend.common.security.JwtTokenProvider;
import com.trekkingcamping.backend.module.user.dto.LoginRequestDto;
import com.trekkingcamping.backend.module.user.dto.LoginResponseDto;
import com.trekkingcamping.backend.module.user.dto.UserRegisterRequestDto;
import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.entity.Role;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.RoleRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, 
                       RoleRepository roleRepository, 
                       JwtTokenProvider jwtTokenProvider,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponseDto registerUser(UserRegisterRequestDto request) {
        if (request.getFullName() == null || request.getFullName().isBlank()
                || request.getEmail() == null || !request.getEmail().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || request.getPassword() == null || request.getPassword().length() < 8
                || request.getPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Vui lòng nhập họ tên, email hợp lệ và mật khẩu từ 8 ký tự, tối đa 72 byte.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại!");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role(null, "ROLE_USER")));
        user.setRole(userRole);

        User savedUser = userRepository.save(user);

        return mapToDto(savedUser);
    }

    public LoginResponseDto login(LoginRequestDto request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập email và mật khẩu.");
        }
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác!");
        }
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa.");
        }

        String roleName = user.getRole() != null ? user.getRole().getName() : "ROLE_USER";
        String token = jwtTokenProvider.generateToken(user.getEmail(), roleName, user.getAuthVersion());

        return new LoginResponseDto(token, mapToDto(user));
    }

    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserService::mapToDto)
                .toList();
    }

    static UserResponseDto mapToDto(User user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : "ROLE_USER";
        UserResponseDto response = new UserResponseDto(
                user.getId(),
                user.getEmail(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                roleName,
                user.getCreatedAt()
        );
        response.setActive(Boolean.TRUE.equals(user.getIsActive()));
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}
