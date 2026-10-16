package com.trekkingcamping.backend.module.booking;
import com.trekkingcamping.backend.module.booking.service.BookingManagementService;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.web.server.ResponseStatusException;
class BookingCompletionTest {
    BookingRepository bookings=mock(BookingRepository.class);PaymentTransactionRepository payments=mock(PaymentTransactionRepository.class);
    TourScheduleRepository schedules=mock(TourScheduleRepository.class);UserRepository users=mock(UserRepository.class);
    BookingManagementService service=new BookingManagementService(bookings,payments,schedules,users, org.mockito.Mockito.mock(com.trekkingcamping.backend.module.notification.service.NotificationService.class));
    Booking setup() {
        var u=new User();u.setId(1L);u.setRole(new Role(1,"ROLE_ADMIN"));
        when(users.findByEmail("admin")).thenReturn(Optional.of(u));
        var t=new Tour();t.setTitle("Tour");t.setSlug("tour");
        var s=new TourSchedule();s.setId(1L);s.setTour(t);s.setStatus("OPEN");s.setDepartureDate(LocalDate.now().minusDays(4));s.setReturnDate(LocalDate.now().minusDays(2));
        var b=Booking.builder().id(1L).user(u).schedule(s).status("CONFIRMED").totalAmount(BigDecimal.valueOf(100)).numberOfPax(1).build();
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(b));
        var p=new PaymentTransaction();p.setStatus("SUCCESS");p.setAmount(BigDecimal.valueOf(100));
        when(payments.findByBookingIdOrderByIdDesc(1L)).thenReturn(List.of(p));return b;
    }
    @Test void completesPaidPastTripOnceWithoutChangingSeats() {
        var b=setup();service.complete("admin",1L);service.complete("admin",1L);
        assertEquals("COMPLETED",b.getStatus());verify(bookings,times(1)).save(b);verifyNoInteractions(schedules);
    }
    @Test void futureUnpaidAndUnconfirmedBookingsCannotComplete() {
        var b=setup();b.getSchedule().setReturnDate(LocalDate.now().plusDays(1));
        assertThrows(ResponseStatusException.class,()->service.complete("admin",1L));
        b.getSchedule().setReturnDate(LocalDate.now().minusDays(2));when(payments.findByBookingIdOrderByIdDesc(1L)).thenReturn(List.of());
        assertThrows(ResponseStatusException.class,()->service.complete("admin",1L));
        b.setStatus("PENDING");assertThrows(ResponseStatusException.class,()->service.complete("admin",1L));
        verify(bookings,never()).save(any());
    }
    @Test void regularUserCannotCompleteBooking() {
        var b=setup();b.getUser().setRole(new Role(2,"ROLE_USER"));
        assertThrows(ResponseStatusException.class,()->service.complete("admin",1L));
        verifyNoInteractions(bookings,payments);
    }
}
