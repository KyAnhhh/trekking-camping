package com.trekkingcamping.backend.module.guide.service;
import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.*;
import com.trekkingcamping.backend.module.auth.service.PasswordResetMailer;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GuideInvitationTest {
    GuideRepository guides=mock(GuideRepository.class); GuideInvitationRepository invites=mock(GuideInvitationRepository.class);
    UserRepository users=mock(UserRepository.class); RoleRepository roles=mock(RoleRepository.class);
    PasswordEncoder encoder=mock(PasswordEncoder.class); PasswordResetMailer mailer=mock(PasswordResetMailer.class);
    NotificationService notifications=mock(NotificationService.class); EntityManager em=mock(EntityManager.class);
    GuideInvitationService service=new GuideInvitationService(guides,invites,users,roles,encoder,mailer,notifications,em);
    User admin; Guide guide; GuideInvitation invitation; String token="a".repeat(43);
    @BeforeEach void setup() {
        admin=new User();admin.setId(1L);admin.setRole(new Role(2,"ROLE_ADMIN"));when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
        guide=new Guide();guide.setId(2L);guide.setFullName("Guide test");when(guides.lockById(2L)).thenReturn(Optional.of(guide));when(guides.findById(2L)).thenReturn(Optional.of(guide));
        invitation=new GuideInvitation();invitation.setGuideId(2L);invitation.setEmail("guide@example.test");invitation.setTokenHash(GuideInvitationService.hash(token));invitation.setStatus("PENDING");invitation.setExpiresAt(Instant.now().plusSeconds(3600));
        when(invites.findByTokenHash(invitation.getTokenHash())).thenAnswer(i->invitation.getTokenHash()==null?Optional.empty():Optional.of(invitation));
        when(roles.findByName("ROLE_GUIDE")).thenReturn(Optional.of(new Role(3,"ROLE_GUIDE")));
        when(users.saveAndFlush(any())).thenAnswer(i->{User u=i.getArgument(0);u.setId(3L);return u;});
        when(encoder.encode(any())).thenReturn("encoded-password");
    }
    @Test void sendUsesRandomTokenAndOnlyStoresDigest() {
        var result=service.send("admin",2L,new GuideInvitationService.Invite(" New@Example.Test "));
        var raw=ArgumentCaptor.forClass(String.class);verify(mailer).sendGuideInvitation(eq("new@example.test"),raw.capture(),eq("Guide test"));
        var stored=ArgumentCaptor.forClass(GuideInvitation.class);verify(invites).saveAndFlush(stored.capture());
        assertEquals(43,raw.getValue().length());assertEquals(GuideInvitationService.hash(raw.getValue()),stored.getValue().getTokenHash());
        assertEquals("PENDING",result.status());assertTrue(result.expiresAt().isAfter(Instant.now().plusSeconds(86300)));
        assertFalse(result.toString().contains(raw.getValue()));assertEquals(1L,stored.getValue().getInvitedBy());
    }
    @Test void acceptsOnceAndCreatesEncodedGuideAccountWithoutLoginToken() {
        service.accept(new GuideInvitationService.Acceptance(token,"test-password"));
        var u=guide.getUser();assertEquals("ROLE_GUIDE",u.getRole().getName());assertEquals("encoded-password",u.getPassword());assertTrue(u.getIsActive());
        assertTrue(u.getAuthVersion()>0);
        assertEquals("guide@example.test",u.getEmail());assertEquals("ACCEPTED",invitation.getStatus());assertNull(invitation.getTokenHash());
        assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        verify(users,times(1)).saveAndFlush(any());verify(notifications).emit(eq(u),anyString(),anyString(),anyString(),eq("/guide-workspace"));
    }
    @Test void rejectsExpiredRevokedAndMalformedTokens() {
        for(String bad : new String[]{"", "short", "a".repeat(200)})assertThrows(ResponseStatusException.class,()->service.preview(bad));
        invitation.setExpiresAt(Instant.now().minusSeconds(1));assertThrows(ResponseStatusException.class,()->service.preview(token));
        invitation.setExpiresAt(Instant.now().plusSeconds(3600));invitation.setStatus("REVOKED");assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        verify(users,never()).saveAndFlush(any());
    }
    @Test void refreshDetectsConcurrentRotationAfterGuideLock() {
        doAnswer(i->{invitation.setTokenHash("different-digest");return null;}).when(em).refresh(invitation);
        assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        verify(users,never()).saveAndFlush(any());
    }
    @Test void existingAccountCannotBeOverwrittenByInvitation() {
        when(users.existsByEmailIgnoreCase(anyString())).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->service.send("admin",2L,new GuideInvitationService.Invite("guide@example.test")));
        assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        verify(users,never()).saveAndFlush(any());verifyNoInteractions(encoder,mailer);
    }
    @Test void linkedOrInactiveGuidesCannotAccept() {
        guide.setActive(false);assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        guide.setActive(true);guide.setUser(new User());assertThrows(ResponseStatusException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"test-password")));
        verify(users,never()).saveAndFlush(any());
    }
    @Test void mailFailureReturns503WithoutExposingSmtpDetails() {
        doThrow(new org.springframework.mail.MailSendException("sensitive-provider-message")).when(mailer).sendGuideInvitation(anyString(),anyString(),anyString());
        var e=assertThrows(ResponseStatusException.class,()->service.send("admin",2L,new GuideInvitationService.Invite("new@example.test")));
        assertEquals(503,e.getStatusCode().value());assertFalse(e.getReason().contains("sensitive-provider"));
    }
    @Test void throttleAndRevokePreserveSendLimit() {
        when(invites.findById(2L)).thenReturn(Optional.of(invitation));invitation.setSentAt(Instant.now());
        assertEquals(429,assertThrows(ResponseStatusException.class,()->service.send("admin",2L,new GuideInvitationService.Invite("new@example.test"))).getStatusCode().value());
        invitation.setSentAt(Instant.now().minusSeconds(90));invitation.setWindowStart(Instant.now());invitation.setSendsInWindow(5);
        assertEquals(429,assertThrows(ResponseStatusException.class,()->service.send("admin",2L,new GuideInvitationService.Invite("new@example.test"))).getStatusCode().value());
        service.revoke("admin",2L);assertNull(invitation.getTokenHash());assertEquals("REVOKED",invitation.getStatus());assertEquals(5,invitation.getSendsInWindow());
    }
    @Test void adminAndPasswordValidation() {
        admin.setRole(new Role(1,"ROLE_USER"));assertEquals(403,assertThrows(ResponseStatusException.class,()->service.status("admin",2L)).getStatusCode().value());
        assertThrows(IllegalArgumentException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"short")));
        assertThrows(IllegalArgumentException.class,()->service.accept(new GuideInvitationService.Acceptance(token,"đ".repeat(40))));
    }
}
