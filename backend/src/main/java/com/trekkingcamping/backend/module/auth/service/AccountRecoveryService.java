package com.trekkingcamping.backend.module.auth.service;

import com.trekkingcamping.backend.module.auth.entity.PasswordResetToken;
import com.trekkingcamping.backend.module.auth.repository.PasswordResetRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
public class AccountRecoveryService {
    private final UserRepository users;
    private final PasswordResetRepository resets;
    private final PasswordResetMailer mailer;
    private final PasswordEncoder encoder;
    private final EntityManager em;
    public AccountRecoveryService(UserRepository users, PasswordResetRepository resets,
                                  PasswordResetMailer mailer, PasswordEncoder encoder, EntityManager em) {
        this.users = users; this.resets = resets; this.mailer = mailer; this.encoder = encoder; this.em = em;
    }

    @Transactional
    public void forgotPassword(String email) {
        if (email == null || email.length() > 254 || !email.trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException("Vui lòng nhập email hợp lệ.");
        }
        mailer.requireConfigured();
        var user = users.findByEmailForUpdate(email.trim()).orElse(null);
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) return;
        Instant now = Instant.now();
        if (resets.countByUserIdAndCreatedAtAfter(user.getId(), now.minusSeconds(3600)) >= 5) return;
        if (resets.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .filter(t -> t.getCreatedAt().isAfter(now.minusSeconds(60))).isPresent()) return;
        byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        var token = new PasswordResetToken(); token.setUser(user); token.setTokenHash(hash(raw));
        token.setCreatedAt(now); token.setExpiresAt(now.plusSeconds(900));
        resets.invalidateAll(user.getId()); resets.saveAndFlush(token);
        try { mailer.sendResetLink(user.getEmail(), raw); }
        catch (org.springframework.mail.MailException e) {
            token.setUsed(true); resets.save(token);
            // Same public response for existing/nonexistent accounts, including delivery errors.
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Password reset email delivery failed ({})", e.getClass().getSimpleName());
        }
    }

    @Transactional
    public void resetPassword(String raw, String password) {
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) throw invalidToken();
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Mật khẩu cần từ 8 ký tự, tối đa 72 byte.");
        }
        var token = resets.findByTokenHash(hash(raw)).orElseThrow(this::invalidToken);
        var user = users.findByEmailForUpdate(token.getUser().getEmail()).orElseThrow(this::invalidToken);
        em.refresh(user);
        em.refresh(token); // Another concurrent request may have consumed it while acquiring the user lock.
        if (token.isUsed() || !token.getExpiresAt().isAfter(Instant.now()) || !Boolean.TRUE.equals(user.getIsActive())) throw invalidToken();
        user.setPassword(encoder.encode(password)); user.setAuthVersion(user.getAuthVersion() + 1);
        user.setUpdatedAt(LocalDateTime.now()); users.save(user);
        resets.invalidateAll(user.getId());
    }

    @Transactional
    public void logout(String email) {
        var user = users.findByEmailForUpdate(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        em.refresh(user);
        user.setAuthVersion(user.getAuthVersion() + 1); users.save(user);
    }

    static String hash(String raw) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ, đã dùng hoặc đã hết hạn.");
    }
}
