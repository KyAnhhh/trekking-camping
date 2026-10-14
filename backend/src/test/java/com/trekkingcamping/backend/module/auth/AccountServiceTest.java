package com.trekkingcamping.backend.module.auth;
import com.trekkingcamping.backend.module.user.service.AccountService;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.auth.repository.PasswordResetRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AccountServiceTest {
    UserRepository users = mock(UserRepository.class);
    PasswordResetRepository resets = mock(PasswordResetRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    EntityManager em = mock(EntityManager.class);
    AccountService service = new AccountService(users, resets, encoder, em);
    User owner() {
        User u = new User(); u.setId(7L); u.setEmail("owner@example.test"); u.setPassword("stored-hash");
        when(users.findByEmailForUpdate(u.getEmail())).thenReturn(Optional.of(u));
        when(users.findByEmail(u.getEmail())).thenReturn(Optional.of(u)); return u;
    }
    @Test void editsOnlyAuthenticatedProfileAndKeepsIdentity() {
        User u = owner();
        var result = service.update(u.getEmail(), new AccountService.Edit(" New Name ", "0900000000"));
        assertEquals("New Name", result.fullName()); assertEquals(u.getEmail(), result.email());
        assertEquals("stored-hash", u.getPassword()); assertEquals(0L, u.getAuthVersion());
        verify(em).refresh(u); verify(users).save(u);
    }
    @Test void passwordChangeChecksOldSecretAndRevokesAllSessionsAndResetLinks() {
        User u = owner(); when(encoder.matches("old-password", "stored-hash")).thenReturn(true);
        when(encoder.encode("new-password")).thenReturn("new-hash");
        service.changePassword(u.getEmail(), new AccountService.ChangePassword("old-password", "new-password"));
        assertEquals(1L, u.getAuthVersion()); assertEquals("new-hash", u.getPassword());
        verify(resets).invalidateAll(7L);
    }
    @Test void wrongPasswordAndInvalidProfileNeverWrite() {
        User u = owner();
        assertThrows(IllegalArgumentException.class, () -> service.changePassword(u.getEmail(), new AccountService.ChangePassword("wrong", "new-password")));
        assertThrows(IllegalArgumentException.class, () -> service.update(u.getEmail(), new AccountService.Edit(" ", "invalid")));
        verify(users, never()).save(any()); verifyNoInteractions(resets);
    }
    @Test void blockedAccountCannotEditEvenWhenItsRowWasReloaded() {
        User u = owner(); doAnswer(i -> {u.setIsActive(false); return null;}).when(em).refresh(u);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.update(u.getEmail(), new AccountService.Edit("Name", "")));
        verify(users, never()).save(any());
    }
}
