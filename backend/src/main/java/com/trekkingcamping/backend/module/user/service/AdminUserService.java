package com.trekkingcamping.backend.module.user.service;

import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

@Service
public class AdminUserService {
    public record Edit(String fullName, String phone, LocalDateTime updatedAt) {}
    public record Activation(Boolean active, LocalDateTime updatedAt) {}
    private static final String LINKED = "Tài khoản có dữ liệu liên quan. Hãy khóa tài khoản để giữ lịch sử thay vì xóa.";
    private final UserRepository users;
    private final UserDependencies dependencies;
    private final EntityManager em;

    public AdminUserService(UserRepository users, UserDependencies dependencies, EntityManager em) {
        this.users = users; this.dependencies = dependencies; this.em = em;
    }

    @Transactional
    public UserResponseDto update(String actor, Long id, Edit input) {
        admin(actor);
        if (input == null || input.fullName() == null || input.fullName().isBlank()
                || input.fullName().length() > 150 || input.phone() != null && !input.phone().isBlank()
                && !input.phone().matches("[+0-9 ().-]{6,30}"))
            throw new IllegalArgumentException("Họ tên bắt buộc, tối đa 150 ký tự; số điện thoại không hợp lệ.");
        User target = target(id, input.updatedAt());
        target.setFullName(input.fullName().trim());
        target.setPhone(input.phone() == null ? "" : input.phone().trim());
        touch(target);
        return UserService.mapToDto(users.save(target));
    }

    @Transactional
    public UserResponseDto activate(String actor, Long id, Activation input) {
        User caller = admin(actor);
        if (input == null || input.active() == null) throw new IllegalArgumentException("Thiếu trạng thái tài khoản.");
        User target = target(id, input.updatedAt());
        protect(caller, target);
        if (!Objects.equals(input.active(), target.getIsActive())) {
            target.setIsActive(input.active());
            // Old JWTs stay revoked even after the account is unlocked.
            target.setAuthVersion(target.getAuthVersion() + 1);
            touch(target);
            users.save(target);
        }
        return UserService.mapToDto(target);
    }

    @Transactional
    public void delete(String actor, Long id, LocalDateTime updatedAt) {
        User caller = admin(actor);
        User target = target(id, updatedAt);
        protect(caller, target);
        if (dependencies.exists(id)) throw conflict(LINKED);
        try {
            users.delete(target);
            // Flush inside this transaction so a concurrent FK insert returns a useful 409.
            users.flush();
        } catch (DataIntegrityViolationException ex) {
            throw conflict(LINKED);
        }
    }

    private User admin(String email) {
        if (email == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        User caller = users.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        em.refresh(caller);
        if (!Boolean.TRUE.equals(caller.getIsActive()) || !isAdmin(caller))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quản trị viên được quản lý người dùng.");
        return caller;
    }
    private User target(Long id, LocalDateTime updatedAt) {
        if (updatedAt == null) throw new IllegalArgumentException("Thiếu phiên bản tài khoản. Hãy tải lại danh sách.");
        User target = users.findByIdForUpdate(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản."));
        em.refresh(target);
        if (!updatedAt.equals(target.getUpdatedAt())) throw conflict("Tài khoản đã thay đổi. Hãy tải lại danh sách trước khi thao tác.");
        return target;
    }
    private void protect(User actor, User target) {
        if (Objects.equals(actor.getId(), target.getId())) throw conflict("Không thể khóa hoặc xóa tài khoản đang đăng nhập.");
        if (isAdmin(target)) throw conflict("Không hỗ trợ khóa hoặc xóa tài khoản quản trị tại đây.");
    }
    private boolean isAdmin(User user) {
        return user.getRole() != null && ("ROLE_ADMIN".equals(user.getRole().getName()) || "ADMIN".equals(user.getRole().getName()));
    }
    private void touch(User user) {
        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        user.setUpdatedAt(now.isAfter(user.getUpdatedAt()) ? now : user.getUpdatedAt().plusNanos(1000));
    }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
