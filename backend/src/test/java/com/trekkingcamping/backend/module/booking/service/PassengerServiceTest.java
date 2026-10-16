package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PassengerServiceTest {
    BookingRepository bookings=mock(BookingRepository.class);BookingPassengerRepository passengers=mock(BookingPassengerRepository.class);
    PassengerAttendanceAuditRepository audits=mock(PassengerAttendanceAuditRepository.class);GuideRepository guides=mock(GuideRepository.class);
    ScheduleGuideRepository assignments=mock(ScheduleGuideRepository.class);TourScheduleRepository schedules=mock(TourScheduleRepository.class);
    UserRepository users=mock(UserRepository.class);EntityManager em=mock(EntityManager.class);
    PassengerService service=new PassengerService(bookings,passengers,audits,guides,assignments,schedules,users,em);
    User owner,guideUser,admin;Guide guide;Booking booking;TourSchedule schedule;List<BookingPassenger> rows;
    @BeforeEach void setup() {
        owner=user(1L,"owner","ROLE_USER");guideUser=user(2L,"guide","ROLE_GUIDE");admin=user(3L,"admin","ROLE_ADMIN");
        schedule=new TourSchedule();schedule.setId(10L);schedule.setStatus("OPEN");schedule.setDepartureDate(today().plusDays(1));schedule.setReturnDate(today().plusDays(3));
        booking=new Booking();booking.setId(7L);booking.setUser(owner);booking.setSchedule(schedule);booking.setStatus("CONFIRMED");booking.setNumberOfPax(2);
        when(bookings.findById(7L)).thenReturn(Optional.of(booking));when(bookings.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));
        when(schedules.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));
        guide=new Guide();guide.setId(8L);guide.setUser(guideUser);guide.setFullName("Guide test");
        when(guides.findByUserId(2L)).thenReturn(Optional.of(guide));when(guides.lockById(8L)).thenReturn(Optional.of(guide));when(assignments.existsByScheduleIdAndGuideId(10L,8L)).thenReturn(true);
        rows=new ArrayList<>();for(int i=1;i<=2;i++){var p=new BookingPassenger();p.setId((long)i);p.setBooking(booking);p.setPosition(i);p.setFullName("Guest "+i);rows.add(p);}
        when(passengers.findByBookingIdOrderByPositionAsc(7L)).thenAnswer(i->rows);
    }
    @Test void ownerCanSaveExactlyBookedCountWithOptimisticRevision() {
        var r=service.saveNames("owner",7L,false,new PassengerService.Names(List.of(" One ","Two"),0L));
        assertEquals(1,r.revision());assertEquals("One",rows.getFirst().getFullName());assertEquals("NOT_CHECKED",rows.getFirst().getAttendanceStatus());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.saveNames("owner",7L,false,new PassengerService.Names(List.of("Other","Two"),0L))).getStatusCode().value());
        verify(passengers,times(2)).save(any());
    }
    @Test void missingRosterCreatesNamedPeopleWithoutGuessingAttendance() {
        rows.clear();service.saveNames("owner",7L,false,new PassengerService.Names(List.of("One","Two"),0L));
        var capture=ArgumentCaptor.forClass(BookingPassenger.class);verify(passengers,times(2)).save(capture.capture());
        assertEquals(List.of(1,2),capture.getAllValues().stream().map(BookingPassenger::getPosition).toList());
        assertTrue(capture.getAllValues().stream().allMatch(p->"NOT_CHECKED".equals(p.getAttendanceStatus())&&p.getMarkedAt()==null));
    }
    @Test void rejectsCountMismatchBlankControlCharactersAndLongNames() {
        for(var input:List.of(List.of("One"),List.of(" ","Two"),List.of("Bad\nname","Two"),List.of("x".repeat(151),"Two")))
            assertThrows(IllegalArgumentException.class,()->service.saveNames("owner",7L,false,new PassengerService.Names(input,0L)));
        verify(passengers,never()).save(any());
    }
    @Test void otherUsersAndUnassignedGuidesCannotSeeRosterOrHistory() {
        user(9L,"other","ROLE_USER");
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.ownerRoster("other",7L,false)).getStatusCode().value());
        assertThrows(ResponseStatusException.class,()->service.ownerHistory("other",7L,false,0));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->service.ownerRoster("owner",7L,true)).getStatusCode().value());
        when(assignments.existsByScheduleIdAndGuideId(10L,8L)).thenReturn(false);
        assertThrows(ResponseStatusException.class,()->service.guideRoster("guide",10L,7L));
        assertThrows(ResponseStatusException.class,()->service.guideHistory("guide",10L,7L,0));verifyNoInteractions(audits);
    }
    @Test void markWritesAuditAndRejectsReplayAndWrongPassenger() {
        var p=service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L));assertEquals(1,p.revision());assertEquals("PRESENT",p.status());
        var log=ArgumentCaptor.forClass(PassengerAttendanceAudit.class);verify(audits).save(log.capture());
        assertEquals("NOT_CHECKED",log.getValue().getPreviousStatus());assertEquals(guide,log.getValue().getGuide());assertEquals(rows.getFirst(),log.getValue().getPassenger());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,1L,new PassengerService.Mark("ABSENT",0L))).getStatusCode().value());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,999L,new PassengerService.Mark("PRESENT",0L))).getStatusCode().value());
        service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",1L));verify(audits,times(1)).save(any());
    }
    @Test void attendanceHistoryNeverPermitsRenamingEvenAfterResetToUnchecked() {
        service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L));
        service.mark("guide",10L,7L,1L,new PassengerService.Mark("NOT_CHECKED",1L));
        assertFalse(service.ownerRoster("admin",7L,true).editable());
        assertThrows(ResponseStatusException.class,()->service.saveNames("admin",7L,true,new PassengerService.Names(List.of("Replacement","Two"),0L)));
        verify(audits,times(2)).save(any());
    }
    @Test void rejectsMarkOutsideWindowOrOnInactiveBookingsAndIncompleteRoster() {
        schedule.setDepartureDate(today().plusDays(5));assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L)));
        schedule.setDepartureDate(today().plusDays(1));booking.setStatus("COMPLETED");assertFalse(service.guideRoster("guide",10L,7L).canCheckIn());
        assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L)));
        booking.setStatus("CONFIRMED");rows.removeLast();assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L)));
        verify(audits,never()).save(any());
    }
    @Test void permissionRevokedWhileWaitingForLocksIsRechecked() {
        doAnswer(i->{guide.setUser(null);return null;}).when(em).refresh(guide);
        assertThrows(ResponseStatusException.class,()->service.mark("guide",10L,7L,1L,new PassengerService.Mark("PRESENT",0L)));
        verify(audits,never()).save(any());
    }
    @Test void ownerCutoffAllowsAdminHelpUntilTourEndsButNotCancelledBooking() {
        schedule.setDepartureDate(today());assertFalse(service.ownerRoster("owner",7L,false).editable());assertTrue(service.ownerRoster("admin",7L,true).editable());
        booking.setStatus("CANCELLED");assertFalse(service.ownerRoster("admin",7L,true).editable());
    }
    @Test void historyIsPagedAndContainsOnlyOperationalFields() throws Exception {
        var audit=new PassengerAttendanceAudit();audit.setId(1L);audit.setPassenger(rows.getFirst());audit.setGuide(guide);audit.setPreviousStatus("NOT_CHECKED");audit.setStatus("PRESENT");audit.setCreatedAt(Instant.now());
        when(audits.findByBookingIdOrderByIdDesc(eq(7L),any())).thenReturn(new PageImpl<>(List.of(audit)));
        var result=service.guideHistory("guide",10L,7L,0);assertEquals("Guest 1",result.items().getFirst().passengerName());
        var json=new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().writeValueAsString(service.guideRoster("guide",10L,7L));
        assertFalse(json.contains("medical"));assertFalse(json.contains("password"));assertFalse(json.contains("email"));
        assertThrows(IllegalArgumentException.class,()->service.ownerHistory("owner",7L,false,-1));
    }
    private LocalDate today(){return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    private User user(Long id,String email,String role){var u=new User();u.setId(id);u.setEmail(email);u.setRole(new Role(1,role));when(users.findByEmail(email)).thenReturn(Optional.of(u));return u;}
}
