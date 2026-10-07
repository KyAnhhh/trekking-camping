package com.trekkingcamping.backend.module.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.booking.dto.BookingRequestDto;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.service.BookingService;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingServiceTest {
    private final BookingRepository bookings = mock(BookingRepository.class);
    private final TourScheduleRepository schedules = mock(TourScheduleRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final BookingService service = new BookingService(bookings, schedules, users);
    private BookingRequestDto request;
    private TourSchedule schedule;
    private User user;

    @BeforeEach
    void setup() {
        user = new User();
        user.setId(7L);
        user.setEmail("traveler@example.test");
        user.setPassword("test-hash-not-for-exposure");
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        Tour tour = new Tour();
        tour.setTitle("Tour thử nghiệm");
        tour.setSlug("tour-thu-nghiem");
        tour.setPricePerPax(new BigDecimal("2500000"));
        schedule = new TourSchedule();
        schedule.setId(3L);
        schedule.setTour(tour);
        schedule.setStatus("OPEN");
        schedule.setDepartureDate(LocalDate.now().plusDays(5));
        schedule.setReturnDate(LocalDate.now().plusDays(7));
        schedule.setAvailableSlots(2);
        when(schedules.findByIdForUpdate(3L)).thenReturn(Optional.of(schedule));
        when(bookings.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        request = new BookingRequestDto(3L, 2, "Traveler", user.getEmail(), "0900000000", null, null, null, null);
    }

    @Test
    void booksByEmailUsingServerPriceAndReturnsSafeDto() throws Exception {
        var result = service.createBooking(user.getEmail(), request);
        assertEquals(new BigDecimal("5000000"), result.totalAmount());
        assertEquals(0, schedule.getAvailableSlots());
        assertEquals("FULL", schedule.getStatus());
        assertEquals("PENDING", result.status());
        assertNotNull(result.createdAt());
        verify(schedules).findByIdForUpdate(3L);
        var json = new ObjectMapper().findAndRegisterModules().valueToTree(result);
        assertFalse(json.has("user"));
        assertFalse(json.toString().contains("test-hash-not-for-exposure"));
    }

    @Test
    void rejectsInvalidPaxBeforeChangingInventory() {
        for (Integer pax : new Integer[]{null, 0, -1}) {
            request.setNumberOfPax(pax);
            assertThrows(IllegalArgumentException.class, () -> service.createBooking(user.getEmail(), request));
        }
        verify(schedules, never()).save(any());
        verify(bookings, never()).save(any());
    }

    @Test
    void rejectsInsufficientAvailabilityWithoutSaving() {
        request.setNumberOfPax(3);
        var error = assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        assertEquals(409, error.getStatusCode().value());
        assertEquals(2, schedule.getAvailableSlots());
        verify(bookings, never()).save(any());
    }

    @Test
    void rejectsClosedPastAndInactiveTours() {
        schedule.setStatus("CANCELLED");
        assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        schedule.setStatus("OPEN");
        schedule.setDepartureDate(LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        schedule.setDepartureDate(LocalDate.now().minusDays(2));
        assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        schedule.setDepartureDate(LocalDate.now().plusDays(5));
        schedule.getTour().setIsActive(false);
        assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        verify(bookings, never()).save(any());
    }

    @Test
    void listsOnlyAuthenticatedUsersBookings() {
        when(bookings.findByUserIdOrderByCreatedAtDesc(7L)).thenReturn(List.of());
        assertTrue(service.getUserBookings(user.getEmail()).isEmpty());
        verify(bookings).findByUserIdOrderByCreatedAtDesc(7L);
    }

    @Test
    void blockedAccountCannotBook() {
        user.setIsActive(false);
        assertThrows(ResponseStatusException.class, () -> service.createBooking(user.getEmail(), request));
        verify(bookings, never()).save(any());
    }

    @Test
    void userSerializationOmitsPassword() throws Exception {
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(user);
        assertFalse(json.contains("password"));
        assertFalse(json.contains("test-hash-not-for-exposure"));
    }
}
