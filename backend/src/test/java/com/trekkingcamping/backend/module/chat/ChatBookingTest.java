package com.trekkingcamping.backend.module.chat;
import com.trekkingcamping.backend.module.chat.service.*;
import com.trekkingcamping.backend.module.chat.entity.*;
import com.trekkingcamping.backend.module.chat.repository.*;
import com.trekkingcamping.backend.module.booking.service.BookingService;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.dto.*;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.repository.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.service.AccountService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class ChatBookingTest {
    final ChatBookingDraftRepository drafts=mock(ChatBookingDraftRepository.class);
    final TourScheduleRepository schedules=mock(TourScheduleRepository.class);
    final TourRepository tours=mock(TourRepository.class);
    final BookingService bookings=mock(BookingService.class);
    final BookingRepository repository=mock(BookingRepository.class);
    final AccountService accounts=mock(AccountService.class);
    final ChatBookingService service=new ChatBookingService(drafts,schedules,tours,bookings,repository,accounts,mock(EntityManager.class));
    final Tour t=new Tour();final TourSchedule s=new TourSchedule();ChatBookingDraft draft;
    final String id=UUID.randomUUID().toString();
    final ChatBookingService.Confirm input=new ChatBookingService.Confirm(true,"Guest","guest@example.test","0900000000");
    ChatBookingTest() {
        when(accounts.me("owner")).thenReturn(new AccountService.Profile(1L,"guest@example.test","Guest","0900000000","ROLE_USER"));
        when(accounts.me("other")).thenReturn(new AccountService.Profile(2L,"other@example.test","Other","0900000000","ROLE_USER"));
        t.setId(3L);t.setTitle("Test");t.setSlug("test");t.setIsActive(true);t.setPricePerPax(new BigDecimal("2000000"));t.setUpdatedAt(LocalDateTime.now().minusDays(1));
        s.setId(4L);s.setTour(t);s.setStatus("OPEN");s.setAvailableSlots(5);s.setDepartureDate(LocalDate.now().plusDays(10));s.setReturnDate(s.getDepartureDate().plusDays(1));
        when(schedules.findById(4L)).thenReturn(Optional.of(s));when(schedules.findByIdForUpdate(4L)).thenReturn(Optional.of(s));
        when(tours.findByIdForUpdate(3L)).thenReturn(Optional.of(t));
        when(drafts.saveAndFlush(any())).thenAnswer(i -> { draft=i.getArgument(0);return draft; });
        when(drafts.locked(id)).thenAnswer(i -> Optional.ofNullable(draft));
        var result=new BookingResponseDto(8L,"BK-TEST","Test","test",4L,s.getDepartureDate(),s.getReturnDate(),2,new BigDecimal("4000000"),"PENDING",LocalDateTime.now());
        when(bookings.createBooking(eq("owner"),any())).thenReturn(result);
    }
    ChatBookingService.Quote prepare() { return service.prepare("owner",new ChatBookingService.Prepare(id,4L,2)); }
    @Test void quotingDoesNotCreateBookingAndUsesDatabasePrice() {
        assertEquals(new BigDecimal("4000000"),prepare().totalAmount());verifyNoInteractions(bookings);
        assertEquals(id,prepare().draftId());verify(drafts,times(1)).saveAndFlush(any());
    }
    @Test void explicitConfirmationAndOwnerAreRequired() {
        prepare();assertThrows(IllegalArgumentException.class,()->service.confirm("owner",id,new ChatBookingService.Confirm(false,"Guest","guest@example.test","0900000000")));
        assertThrows(ResponseStatusException.class,()->service.confirm("other",id,input));verifyNoInteractions(bookings);
    }
    @Test void changedPriceDateCapacityAndExpiryFailWithoutWrites() {
        prepare();t.setPricePerPax(new BigDecimal("2100000"));assertThrows(ResponseStatusException.class,()->service.confirm("owner",id,input));
        t.setPricePerPax(new BigDecimal("2000000"));s.setAvailableSlots(1);assertThrows(ResponseStatusException.class,()->service.confirm("owner",id,input));
        s.setAvailableSlots(5);s.setDepartureDate(s.getDepartureDate().plusDays(1));assertThrows(ResponseStatusException.class,()->service.confirm("owner",id,input));
        s.setDepartureDate(draft.getDepartureDate());draft.setExpiresAt(Instant.now().minusSeconds(1));assertThrows(ResponseStatusException.class,()->service.confirm("owner",id,input));verifyNoInteractions(bookings);
    }
    @Test void retryReturnsOriginalBookingEvenAfterExpiryAndNeverChargesOrCreatesAgain() {
        prepare();assertEquals(8L,service.confirm("owner",id,input).id());
        User user=new User();user.setId(1L);
        var b=Booking.builder().id(8L).user(user).schedule(s).numberOfPax(2).totalAmount(new BigDecimal("4000000")).status("PENDING").build();
        when(repository.findById(8L)).thenReturn(Optional.of(b));draft.setExpiresAt(Instant.now().minusSeconds(1));
        assertEquals(8L,service.confirm("owner",id,input).id());verify(bookings,times(1)).createBooking(eq("owner"),any());
        assertThrows(ResponseStatusException.class,()->service.confirm("owner",id,new ChatBookingService.Confirm(true,"Changed","guest@example.test","0900000000")));
    }
}
