package com.trekkingcamping.backend.module.notification;
import com.trekkingcamping.backend.module.notification.entity.Notification;
import com.trekkingcamping.backend.module.notification.repository.NotificationRepository;
import com.trekkingcamping.backend.module.notification.service.*;
import com.trekkingcamping.backend.module.auth.service.PasswordResetMailer;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageImpl;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class NotificationTest {
    @Test void optedOutRecipientSkipsQueuedMail() {
        var n=pending();var worker=new NotificationDelivery(repository,mailer);var prefs=mock(NotificationPreferences.class);
        worker.setPreferences(prefs);when(prefs.enabled(7L)).thenReturn(false);
        assertTrue(worker.sendNext());assertEquals("SKIPPED",n.getEmailStatus());verifyNoInteractions(mailer);
    }
    NotificationRepository repository=mock(NotificationRepository.class);UserRepository users=mock(UserRepository.class);
    JdbcTemplate jdbc=mock(JdbcTemplate.class);PasswordResetMailer mailer=mock(PasswordResetMailer.class);
    NotificationService service=new NotificationService(repository,users,jdbc,false);
    User owner() {var u=new User();u.setId(7L);u.setEmail("owner@example.test");when(users.findByEmail(u.getEmail())).thenReturn(Optional.of(u));return u;}
    @Test void readAndListAreAlwaysScopedToAuthenticatedOwner() {
        var u=owner();when(repository.findByUserIdOrderByIdDesc(eq(7L),any())).thenReturn(new PageImpl<>(List.of()));
        service.inbox(u.getEmail(),0);service.read(u.getEmail(),999L);service.readAll(u.getEmail());
        verify(repository).read(eq(999L),eq(7L),any());verify(repository).readAll(eq(7L),any());
        verify(repository).findByUserIdOrderByIdDesc(eq(7L),argThat(p->p.getPageSize()==20));
        assertThrows(IllegalArgumentException.class,()->service.inbox(u.getEmail(),-1));
    }
    @Test void businessEventsUseDeduplicatedKeyAndNoSensitiveDeclarationOrContactData() {
        var u=owner();var b=new Booking();b.setId(3L);b.setUser(u);b.setBookingCode("BK-TEST");b.setMedicalConditions("must-not-appear");b.setContactEmail("other@example.test");
        service.booking(b,"CONFIRMED","Đã xác nhận","Xem chi tiết đơn.");
        verify(jdbc).update(contains("on conflict(user_id,event_key) do nothing"),eq(7L),eq("booking:3:CONFIRMED"),eq("Đã xác nhận"),eq("Đơn BK-TEST. Xem chi tiết đơn."),eq("/my-bookings/3"),eq("SKIPPED"));
        verifyNoInteractions(mailer);
    }
    Notification pending() {var n=new Notification();n.setId(1L);n.setUser(owner());n.setTitle("Title");n.setBody("Body");n.setLink("/my-bookings/1");n.setEmailStatus("PENDING");when(repository.nextMail(any())).thenReturn(Optional.of(n));return n;}
    @Test void smtpFailureSchedulesBoundedRetriesAndPreservesInAppNotification() {
        var n=pending();doThrow(new IllegalStateException("private SMTP details")).when(mailer).sendNotification(any(),any(),any(),any());
        var worker=new NotificationDelivery(repository,mailer);
        worker.sendNext();assertEquals("RETRY",n.getEmailStatus());assertEquals(1,n.getAttempts());assertTrue(n.getNextAttemptAt().isAfter(Instant.now()));assertNull(n.getSentAt());
        n.setAttempts(4);worker.sendNext();assertEquals("FAILED",n.getEmailStatus());assertEquals("Body",n.getBody());
    }
    @Test void successfulDeliveryIsMarkedSentAndInactiveRecipientIsSkipped() {
        var n=pending();var worker=new NotificationDelivery(repository,mailer);worker.sendNext();assertEquals("SENT",n.getEmailStatus());assertNotNull(n.getSentAt());
        n.getUser().setIsActive(false);worker.sendNext();assertEquals("SKIPPED",n.getEmailStatus());verify(mailer,times(1)).sendNotification(any(),any(),any(),any());
    }
    @Test void emptyQueueDoesNotSend() {assertFalse(new NotificationDelivery(repository,mailer).sendNext());verifyNoInteractions(mailer);}
}
