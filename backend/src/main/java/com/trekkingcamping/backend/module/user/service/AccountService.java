package com.trekkingcamping.backend.module.user.service;

import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.auth.repository.PasswordResetRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
public class AccountService {
    public record Profile(Long id, String email, String fullName, String phone, String role) {}
    public record Edit(String fullName, String phone) {}
    public record ChangePassword(String currentPassword, String newPassword) {}
    private final UserRepository users;
    private final PasswordResetRepository resets;
    private final PasswordEncoder encoder;
    private final EntityManager em;
    public AccountService(UserRepository users, PasswordResetRepository resets, PasswordEncoder encoder, EntityManager em) {
        this.users = users; this.resets = resets; this.encoder = encoder; this.em = em;
    }
    @Transactional(readOnly = true)
    public Profile me(String email) { return profile(require(email, false)); }
    @Transactional
    public Profile update(String email, Edit input) {
        if (input == null || input.fullName() == null || input.fullName().isBlank() || input.fullName().length() > 150
                || input.phone() != null && !input.phone().isBlank() && !input.phone().matches("[+0-9 ().-]{6,30}"))
            throw new IllegalArgumentException("Họ tên bắt buộc, tối đa 150 ký tự; số điện thoại không hợp lệ.");
        User user = require(email, true);
        user.setFullName(input.fullName().trim());
        user.setPhone(input.phone() == null ? "" : input.phone().trim());
        user.setUpdatedAt(LocalDateTime.now()); users.save(user);
        return profile(user);
    }
    @Transactional
    public void changePassword(String email, ChangePassword input) {
        if (input == null || input.currentPassword() == null || input.currentPassword().length() > 200
                || input.newPassword() == null || input.newPassword().length() < 8
                || input.newPassword().getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Mật khẩu mới cần từ 8 ký tự, tối đa 72 byte.");
        User user = require(email, true);
        if (!encoder.matches(input.currentPassword(), user.getPassword()))
            throw new IllegalArgumentException("Mật khẩu hiện tại chưa đúng.");
        if (encoder.matches(input.newPassword(), user.getPassword()))
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu hiện tại.");
        user.setPassword(encoder.encode(input.newPassword()));
        user.setAuthVersion(user.getAuthVersion() + 1);
        user.setUpdatedAt(LocalDateTime.now()); users.save(user);
        resets.invalidateAll(user.getId());
    }
    private User require(String email, boolean lock) {
        if (email == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        User user = (lock ? users.findByEmailForUpdate(email) : users.findByEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (lock) em.refresh(user);
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }
    private Profile profile(User u) {
        return new Profile(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(),
                u.getRole() == null ? "ROLE_USER" : u.getRole().getName());
    }
}
