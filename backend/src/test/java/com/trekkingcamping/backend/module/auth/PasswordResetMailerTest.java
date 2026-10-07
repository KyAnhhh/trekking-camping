package com.trekkingcamping.backend.module.auth;

import com.trekkingcamping.backend.module.auth.service.PasswordResetMailer;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetMailerTest {
    @Test void configuresAuthenticatedTlsAndKeepsResetTokenInFragment() {
        var mailer = new PasswordResetMailer("smtp.example.test", 587, "sender@example.test", "synthetic-only",
                "sender@example.test", "http://localhost:5173");
        var configured = (JavaMailSenderImpl) ReflectionTestUtils.getField(mailer, "sender");
        assertEquals("true", configured.getJavaMailProperties().getProperty("mail.smtp.starttls.required"));
        assertEquals("true", configured.getJavaMailProperties().getProperty("mail.smtp.ssl.checkserveridentity"));
        var sender = spy(configured);
        doNothing().when(sender).send(any(SimpleMailMessage.class));
        ReflectionTestUtils.setField(mailer, "sender", sender);
        mailer.sendResetLink("recipient@example.test", "synthetic-token");
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class); verify(sender).send(message.capture());
        assertTrue(message.getValue().getText().contains("/reset-password#token=synthetic-token"));
        assertFalse(message.getValue().getText().contains("?token="));
    }
    @Test void missingCredentialsOrUntrustedFrontendConfigurationFailsClearly() {
        var empty = new PasswordResetMailer("", 587, "", "", "", "http://localhost:5173");
        assertThrows(ResponseStatusException.class, empty::requireConfigured);
        for (String url : new String[]{"javascript:alert(1)", "http://public.example.test", "https://user@host.test", "https://host.test?redirect=bad"}) {
            var mailer = new PasswordResetMailer("smtp.example.test", 587, "sender@example.test", "synthetic-only", "sender@example.test", url);
            assertThrows(ResponseStatusException.class, mailer::requireConfigured);
        }
    }
}
