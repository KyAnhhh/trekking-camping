package com.trekkingcamping.backend.module.tour;
import com.trekkingcamping.backend.module.tour.service.TourManagementService;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.guide.repository.ScheduleGuideRepository;
import com.trekkingcamping.backend.module.guide.service.GuideService;
import com.trekkingcamping.backend.module.guide.entity.ScheduleGuide;
import org.junit.jupiter.api.Test;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.web.server.ResponseStatusException;
class TourManagementTest {
    @Test void pickupChangeIsBlockedOnceBookingExists() {
        var s=setup();when(bookings.existsByScheduleId(2L)).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate(),s.getReturnDate(),10,"OPEN",s.getDepartureDate().atTime(6,0),"New pickup")));
        verify(schedules,never()).save(any());
    }
    TourRepository tours=mock(TourRepository.class); TourScheduleRepository schedules=mock(TourScheduleRepository.class);
    BookingRepository bookings=mock(BookingRepository.class); ScheduleGuideRepository assignments=mock(ScheduleGuideRepository.class);
    TourManagementService service=new TourManagementService(tours,schedules,mock(TourItineraryRepository.class),mock(TourGearRepository.class),bookings,assignments,mock(GuideService.class),mock(EntityManager.class));
    TourSchedule setup() {
        var t=new Tour();t.setId(1L);t.setDurationDays(2);t.setMaxCapacity(10);
        var s=new TourSchedule();s.setId(2L);s.setTour(t);s.setStatus("OPEN");s.setAvailableSlots(10);s.setDepartureDate(LocalDate.now().plusDays(20));s.setReturnDate(s.getDepartureDate().plusDays(1));
        when(tours.findByIdForUpdate(1L)).thenReturn(Optional.of(t));when(schedules.findByIdForUpdate(2L)).thenReturn(Optional.of(s));when(schedules.findByTourId(1L)).thenReturn(List.of(s));return s;
    }
    @Test void cannotHideTourWithUpcomingBookings() {
        setup();when(bookings.existsByScheduleIdAndStatusNot(2L,"CANCELLED")).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->service.active(1L,new TourManagementService.Active(false)));
        verify(tours,never()).save(any());
    }
    @Test void cannotChangeDatesOrSeatsAfterAnyBooking() {
        var s=setup();when(bookings.existsByScheduleId(2L)).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate(),s.getReturnDate(),9,"OPEN")));
        verify(schedules,never()).save(any());
    }
    @Test void dateChangesRequireRemovingGuideAssignments() {
        var s=setup();when(assignments.forSchedules(List.of(2L))).thenReturn(List.of(new ScheduleGuide()));
        assertThrows(ResponseStatusException.class,()->service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate().plusDays(1),s.getReturnDate().plusDays(1),10,"OPEN")));
        verify(schedules,never()).save(any());
    }
    @Test void closesEmptyScheduleButNeverReopensCancelledSchedule() {
        var s=setup();service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate(),s.getReturnDate(),10,"CLOSED"));
        assertEquals("CLOSED",s.getStatus());s.setStatus("CANCELLED");
        assertThrows(ResponseStatusException.class,()->service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate(),s.getReturnDate(),10,"OPEN")));
    }
    @Test void cannotOperateOnAnotherToursSchedule() {
        var s=setup();s.getTour().setId(9L);
        assertThrows(ResponseStatusException.class,()->service.updateSchedule(1L,2L,new TourManagementService.ScheduleEdit(s.getDepartureDate(),s.getReturnDate(),10,"OPEN")));
    }
}
