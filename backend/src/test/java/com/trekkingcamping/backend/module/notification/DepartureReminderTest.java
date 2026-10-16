package com.trekkingcamping.backend.module.notification;
import com.trekkingcamping.backend.module.notification.service.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
class DepartureReminderTest {
    @Test void reminderRechecksCommittedBookingAndScheduleBeforeCreatingIdempotentEvent() {
        var bookings=mock(BookingRepository.class);var notifications=mock(NotificationService.class);var em=mock(EntityManager.class);
        var service=new DepartureReminder(bookings,notifications,em);var b=new Booking();b.setId(1L);b.setStatus("CONFIRMED");
        var tomorrow=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);var s=new TourSchedule();s.setDepartureDate(tomorrow);s.setStatus("OPEN");b.setSchedule(s);
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(b));
        service.remind(1L);verify(notifications).booking(eq(b),eq("REMINDER:"+tomorrow),anyString(),anyString());
        clearInvocations(notifications);b.setStatus("CANCELLED");service.remind(1L);verifyNoInteractions(notifications);
        b.setStatus("CONFIRMED");s.setStatus("CANCELLED");service.remind(1L);verifyNoInteractions(notifications);
        s.setStatus("OPEN");s.setDepartureDate(tomorrow.plusDays(1));service.remind(1L);verifyNoInteractions(notifications);
    }
}
