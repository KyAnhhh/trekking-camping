package com.trekkingcamping.backend.module.auth;

import com.trekkingcamping.backend.common.security.JwtTokenProvider;
import com.trekkingcamping.backend.module.auth.entity.PasswordResetToken;
import com.trekkingcamping.backend.module.auth.repository.PasswordResetRepository;
import com.trekkingcamping.backend.module.auth.service.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccountRecoveryTest {
    UserRepository users = mock(UserRepository.class);
    PasswordResetRepository resets = mock(PasswordResetRepository.class);
    PasswordResetMailer mailer = mock(PasswordResetMailer.class);
    EntityManager em = mock(EntityManager.class);
    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    AccountRecoveryService service = new AccountRecoveryService(users, resets, mailer, encoder, em);
    User user;
    @BeforeEach void setup() {
        user = new User(); user.setId(1L); user.setEmail("test@example.test"); user.setPassword(encoder.encode("old-password"));
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
    }
    @Test void storesOnlyHashAndEmailsOneTimeLinkThenRevokesSessions() throws Exception {
        service.forgotPassword(user.getEmail());
        var raw = ArgumentCaptor.forClass(String.class);
        verify(mailer).sendResetLink(eq(user.getEmail()), raw.capture());
        var stored = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resets).saveAndFlush(stored.capture());
        assertNotEquals(raw.getValue(), stored.getValue().getTokenHash());
        assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getValue().getBytes(StandardCharsets.UTF_8))), stored.getValue().getTokenHash());
        assertEquals(900, stored.getValue().getExpiresAt().getEpochSecond() - stored.getValue().getCreatedAt().getEpochSecond());
        when(resets.findByTokenHash(stored.getValue().getTokenHash())).thenReturn(Optional.of(stored.getValue()));
        service.resetPassword(raw.getValue(), "new-password");
        assertTrue(encoder.matches("new-password", user.getPassword())); assertEquals(1L, user.getAuthVersion());
        verify(resets, times(2)).invalidateAll(1L);
    }
    @Test void unknownAndDisabledAccountsNeverReceiveEmail() {
        service.forgotPassword("unknown@example.test"); user.setIsActive(false); service.forgotPassword(user.getEmail());
        verify(mailer, never()).sendResetLink(any(), any()); verify(resets, never()).saveAndFlush(any());
    }
    @Test void throttlesRepeatRequestsAndHourlyLimit() {
        PasswordResetToken recent = new PasswordResetToken(); recent.setCreatedAt(Instant.now());
        when(resets.findTopByUserIdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(recent));
        service.forgotPassword(user.getEmail());
        when(resets.countByUserIdAndCreatedAtAfter(eq(1L), any())).thenReturn(5L);
        service.forgotPassword(user.getEmail()); verify(mailer, never()).sendResetLink(any(), any());
    }
    @Test void rejectsExpiredUsedAndForgedTokensAndWeakPasswords() {
        String raw = "a".repeat(43);
        PasswordResetToken token = new PasswordResetToken(); token.setUser(user); token.setExpiresAt(Instant.now().minusSeconds(1));
        when(resets.findByTokenHash(any())).thenReturn(Optional.of(token));
        assertThrows(ResponseStatusException.class, () -> service.resetPassword(raw, "new-password"));
        token.setExpiresAt(Instant.now().plusSeconds(900)); token.setUsed(true);
        assertThrows(ResponseStatusException.class, () -> service.resetPassword(raw, "new-password"));
        assertThrows(ResponseStatusException.class, () -> service.resetPassword("forged", "new-password"));
        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(raw, "short"));
        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(raw, "ế".repeat(30)));
        verify(users, never()).save(any());
    }
    @Test void reloadsConsumedTokenAfterAcquiringLock() {
        var token = new PasswordResetToken(); token.setUser(user); token.setExpiresAt(Instant.now().plusSeconds(900));
        when(resets.findByTokenHash(any())).thenReturn(Optional.of(token));
        doAnswer(inv -> { token.setUsed(true); return null; }).when(em).refresh(token);
        assertThrows(ResponseStatusException.class, () -> service.resetPassword("a".repeat(43), "new-password"));
        verify(users, never()).save(any());
    }
    @Test void logoutInvalidatesOldJwtButNewLoginVersionWorks() {
        var jwt = new JwtTokenProvider("synthetic-signing-secret-at-least-32-bytes");
        String old = jwt.generateToken(user.getEmail(), "ROLE_USER", user.getAuthVersion());
        service.logout(user.getEmail());
        assertFalse(jwt.matchesAuthVersion(old, user.getAuthVersion()));
        assertTrue(jwt.matchesAuthVersion(jwt.generateToken(user.getEmail(), "ROLE_USER", user.getAuthVersion()), user.getAuthVersion()));
    }
    @Test void missingMailConfigurationDoesNotCreateTokens() {
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)).when(mailer).requireConfigured();
        assertThrows(ResponseStatusException.class, () -> service.forgotPassword(user.getEmail())); verifyNoInteractions(resets);
    }
}
