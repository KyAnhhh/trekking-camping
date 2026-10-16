package com.trekkingcamping.backend.module.user.service;

import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminUserServiceTest {
    UserRepository users = mock(UserRepository.class);
    UserDependencies dependencies = mock(UserDependencies.class);
    EntityManager em = mock(EntityManager.class);
    AdminUserService service = new AdminUserService(users, dependencies, em);
    LocalDateTime version = LocalDateTime.of(2026, 10, 15, 10, 0);
    User admin, target;
    @BeforeEach void setup() {
        admin = user(1L, "ROLE_ADMIN"); target = user(2L, "ROLE_USER");
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(target));
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
    }
    @Test void editOnlyChangesContactFieldsAndReturnsNoCredentials() throws Exception {
        var result = service.update(admin.getEmail(), 2L, new AdminUserService.Edit(" New name ", "+84 900000000", version));
        assertEquals("New name", result.getFullName());
        assertEquals(target.getEmail(), result.getEmail());
        assertEquals("ROLE_USER", result.getRole());
        assertTrue(result.getActive()); assertTrue(result.getUpdatedAt().isAfter(version));
        assertEquals(0L, target.getAuthVersion());
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
        var json = mapper.readTree(mapper.writeValueAsString(result));
        assertFalse(json.has("password")); assertFalse(json.has("authVersion"));
        verify(em).refresh(target);
    }
    @Test void disableThenEnableDoesNotReviveOldJwtVersions() {
        service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(false, version));
        assertFalse(target.getIsActive()); assertEquals(1L, target.getAuthVersion());
        service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(true, target.getUpdatedAt()));
        assertTrue(target.getIsActive()); assertEquals(2L, target.getAuthVersion());
    }
    @Test void repeatedSameStateDoesNotChangeVersion() {
        service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(true, version));
        assertEquals(0L, target.getAuthVersion()); assertEquals(version, target.getUpdatedAt());
        verify(users, never()).save(any());
    }
    @Test void selfCannotBeDeletedOrDisabled() {
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(admin));
        conflict(() -> service.delete(admin.getEmail(), 1L, version));
        conflict(() -> service.activate(admin.getEmail(), 1L, new AdminUserService.Activation(false, version)));
        verify(users, never()).delete(any());
    }
    @Test void otherAdminsAreProtectedIncludingLegacyRoleName() {
        for (String role : new String[]{"ROLE_ADMIN", "ADMIN"}) {
            target.setRole(new Role(1, role));
            conflict(() -> service.delete(admin.getEmail(), 2L, version));
            conflict(() -> service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(false, version)));
        }
    }
    @Test void staleWritesDoNotChangeOrDeleteUser() {
        var old = version.minusSeconds(1);
        conflict(() -> service.update(admin.getEmail(), 2L, new AdminUserService.Edit("Name", "", old)));
        conflict(() -> service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(false, old)));
        conflict(() -> service.delete(admin.getEmail(), 2L, old));
        verify(users, never()).save(any()); verify(users, never()).delete(any());
    }
    @Test void linkedDataBlocksDeletionAndSuggestsLocking() {
        when(dependencies.exists(2L)).thenReturn(true);
        var ex = assertThrows(ResponseStatusException.class, () -> service.delete(admin.getEmail(), 2L, version));
        assertEquals(409, ex.getStatusCode().value()); assertTrue(ex.getReason().contains("khóa"));
        verify(users, never()).delete(any());
    }
    @Test void unusedAccountCanBeDeleted() {
        service.delete(admin.getEmail(), 2L, version);
        verify(users).delete(target); verify(users).flush();
    }
    @Test void concurrentForeignKeyConflictIsReportedAs409() {
        doThrow(new DataIntegrityViolationException("private database detail")).when(users).flush();
        var ex = assertThrows(ResponseStatusException.class, () -> service.delete(admin.getEmail(), 2L, version));
        assertEquals(409, ex.getStatusCode().value()); assertFalse(ex.getReason().contains("private database"));
    }
    @Test void inactiveAdminAndOtherRolesCannotManageUsers() {
        admin.setIsActive(false);
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.delete(admin.getEmail(), 2L, version)).getStatusCode().value());
        admin.setIsActive(true);
        for (String role : new String[]{"ROLE_USER", "ROLE_GUIDE"}) {
            admin.setRole(new Role(1, role));
            assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.update(admin.getEmail(), 2L, new AdminUserService.Edit("Name", "", version))).getStatusCode().value());
        }
        verify(users, never()).findByIdForUpdate(any());
    }
    @Test void validatesContactAndVersionAndMissingAccount() {
        assertThrows(IllegalArgumentException.class, () -> service.update(admin.getEmail(), 2L, new AdminUserService.Edit("  ", "", version)));
        assertThrows(IllegalArgumentException.class, () -> service.update(admin.getEmail(), 2L, new AdminUserService.Edit("Name", "wrong-number", version)));
        assertThrows(IllegalArgumentException.class, () -> service.activate(admin.getEmail(), 2L, new AdminUserService.Activation(null, version)));
        assertThrows(IllegalArgumentException.class, () -> service.delete(admin.getEmail(), 2L, null));
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.delete(admin.getEmail(), 2L, version)).getStatusCode().value());
    }
    private User user(Long id, String role) {
        User user = new User(); user.setId(id); user.setEmail("user"+id+"@example.test");
        user.setRole(new Role(1, role)); user.setFullName("Original"); user.setUpdatedAt(version);
        user.setPassword("test-only"); return user;
    }
    private void conflict(org.junit.jupiter.api.function.Executable action) {
        assertEquals(409, assertThrows(ResponseStatusException.class, action).getStatusCode().value());
    }
}
