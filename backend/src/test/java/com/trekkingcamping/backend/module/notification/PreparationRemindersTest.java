package com.trekkingcamping.backend.module.notification;
import com.trekkingcamping.backend.module.notification.service.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
class PreparationRemindersTest {
 JdbcTemplate jdbc=mock(JdbcTemplate.class);BookingRepository bookings=mock(BookingRepository.class);NotificationService notices=mock(NotificationService.class);EntityManager em=mock(EntityManager.class);
 PreparationReminders service=new PreparationReminders(jdbc,bookings,notices,em);Booking b;TourSchedule s;
 @BeforeEach void setup(){s=new TourSchedule();s.setId(10L);s.setStatus("OPEN");s.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3));b=new Booking();b.setId(1L);b.setStatus("CONFIRMED");b.setSchedule(s);b.setNumberOfPax(2);when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(b));when(jdbc.queryForObject(anyString(),eq(Long.class),eq(1L))).thenReturn(0L);}
 @Test void sameTripUsesStableDeduplicationKeys(){service.remind(1L);service.remind(1L);verify(notices,times(2)).booking(eq(b),eq("PREPARE:10:"+s.getDepartureDate()),anyString(),anyString());verify(notices,times(2)).booking(eq(b),eq("PASSENGER_MISSING:10:"+s.getDepartureDate()),anyString(),anyString());}
 @Test void cancelledBookingDoesNotNotify(){b.setStatus("CANCELLED");service.remind(1L);verifyNoInteractions(notices);}
 @Test void cancelledScheduleDoesNotNotify(){s.setStatus("CANCELLED");service.remind(1L);verifyNoInteractions(notices);}
 @Test void fullPassengerListDoesNotGetMissingReminder(){when(jdbc.queryForObject(anyString(),eq(Long.class),eq(1L))).thenReturn(2L);service.remind(1L);verify(notices,never()).booking(any(),startsWith("PASSENGER_MISSING"),anyString(),anyString());}
 @Test void outsideWindowDoesNotNotify(){s.setDepartureDate(s.getDepartureDate().plusDays(1));service.remind(1L);verifyNoInteractions(notices);}
}
