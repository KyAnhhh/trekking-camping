package com.trekkingcamping.backend.module.guide;
import com.trekkingcamping.backend.module.guide.service.GuideWorkspaceService;
import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.*;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GuideWorkspaceTest {
    GuideRepository guides=mock(GuideRepository.class);ScheduleGuideRepository assignments=mock(ScheduleGuideRepository.class);
    TourScheduleRepository schedules=mock(TourScheduleRepository.class);BookingRepository bookings=mock(BookingRepository.class);
    BookingAttendanceRepository attendance=mock(BookingAttendanceRepository.class);UserRepository users=mock(UserRepository.class);RoleRepository roles=mock(RoleRepository.class);
    NotificationService notifications=mock(NotificationService.class);EntityManager em=mock(EntityManager.class);
    GuideInvitationRepository invitations=mock(GuideInvitationRepository.class);
    com.trekkingcamping.backend.module.booking.repository.BookingPassengerRepository passengers=mock(com.trekkingcamping.backend.module.booking.repository.BookingPassengerRepository.class);
    GuideWorkspaceService service=new GuideWorkspaceService(guides,assignments,schedules,bookings,attendance,users,roles,notifications,em,invitations,passengers);
    User user;Guide guide;TourSchedule schedule;Booking booking;
    @BeforeEach void setup() {
        user=new User();user.setId(1L);user.setEmail("guide@example.test");user.setRole(new Role(3,"ROLE_GUIDE"));
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        guide=new Guide();guide.setId(4L);guide.setUser(user);when(guides.findByUserId(1L)).thenReturn(Optional.of(guide));when(guides.lockById(4L)).thenReturn(Optional.of(guide));
        schedule=new TourSchedule();schedule.setId(10L);schedule.setStatus("OPEN");schedule.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));schedule.setReturnDate(schedule.getDepartureDate().plusDays(1));
        var tour=new Tour();tour.setTitle("Test trip");schedule.setTour(tour);when(schedules.findById(10L)).thenReturn(Optional.of(schedule));when(schedules.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));
        booking=new Booking();booking.setId(8L);booking.setSchedule(schedule);booking.setNumberOfPax(2);booking.setStatus("CONFIRMED");booking.setContactPhone("0900000000");booking.setMedicalConditions("private");
        when(bookings.findByIdForUpdate(8L)).thenReturn(Optional.of(booking));
    }
    @Test void unassignedGuideCannotReadRosterOrWriteAttendance() {
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.roster(user.getEmail(),10L,0)).getStatusCode().value());
        assertThrows(ResponseStatusException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(1,0L)));verifyNoInteractions(attendance);
    }
    @Test void checkedCountIsBoundedAndStaleRevisionCannotOverwrite() {
        when(assignments.existsByScheduleIdAndGuideId(10L,4L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(3,0L)));
        var mark=new BookingAttendance();mark.setBookingId(8L);mark.setRevision(2);when(attendance.findById(8L)).thenReturn(Optional.of(mark));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(1,1L))).getStatusCode().value());
        service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(1,2L));assertEquals(3,mark.getRevision());assertEquals(1,mark.getPresentCount());assertEquals(4L,mark.getMarkedByGuideId());
        when(passengers.existsByBookingId(8L)).thenReturn(true);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(2,3L))).getStatusCode().value());
        assertEquals(1,mark.getPresentCount());
    }
    @Test void mismatchedBookingAndCancelledTripAreRejected() {
        when(assignments.existsByScheduleIdAndGuideId(10L,4L)).thenReturn(true);
        var another=new TourSchedule();another.setId(11L);booking.setSchedule(another);
        assertThrows(ResponseStatusException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(1,0L)));
        booking.setSchedule(schedule);schedule.setStatus("CANCELLED");
        assertThrows(ResponseStatusException.class,()->service.checkIn(user.getEmail(),10L,8L,new GuideWorkspaceService.CheckIn(1,0L)));verifyNoInteractions(attendance);
    }
    @Test void contactPhoneVisibleOnlyInOperationalWindowAndNoHealthDataInDto() {
        when(assignments.existsByScheduleIdAndGuideId(10L,4L)).thenReturn(true);
        when(bookings.findByScheduleIdAndStatusInOrderByIdAsc(eq(10L),any(),any())).thenReturn(new PageImpl<>(List.of(booking)));
        assertEquals("0900000000",service.roster(user.getEmail(),10L,0).guests().items().getFirst().contactPhone());
        var person=new com.trekkingcamping.backend.module.booking.entity.BookingPassenger();person.setBooking(booking);person.setAttendanceStatus("PRESENT");
        when(passengers.findByBookingIdIn(List.of(8L))).thenReturn(List.of(person));
        var old=new BookingAttendance();old.setBookingId(8L);old.setPresentCount(2);when(attendance.findByBookingIdIn(List.of(8L))).thenReturn(List.of(old));
        var named=service.roster(user.getEmail(),10L,0).guests().items().getFirst();assertEquals(1,named.presentCount());assertEquals(1,named.namedPassengers());
        schedule.setDepartureDate(schedule.getDepartureDate().plusDays(5));schedule.setReturnDate(schedule.getDepartureDate().plusDays(1));
        var result=service.roster(user.getEmail(),10L,0);assertNull(result.guests().items().getFirst().contactPhone());assertFalse(result.canCheckIn());assertFalse(result.toString().contains("private"));
    }
    @Test void linkingRequiresAdminAndCannotReplaceAnotherRoleOrExistingLink() {
        assertEquals(403,assertThrows(ResponseStatusException.class,()->service.link(user.getEmail(),4L,new GuideWorkspaceService.LinkAccount("other@example.test"))).getStatusCode().value());
        var admin=new User();admin.setRole(new Role(2,"ROLE_ADMIN"));when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.link("admin",4L,new GuideWorkspaceService.LinkAccount("other@example.test"))).getStatusCode().value());
        guide.setUser(null);when(users.findByEmailForUpdate("admin@example.test")).thenReturn(Optional.of(admin));
        assertThrows(ResponseStatusException.class,()->service.link("admin",4L,new GuideWorkspaceService.LinkAccount("admin@example.test")));verifyNoInteractions(notifications);
    }
    @Test void linkAndUnlinkRevokeSessionsAndRestoreUserRole() {
        var admin=new User();admin.setRole(new Role(2,"ROLE_ADMIN"));when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
        guide.setUser(null);user.setRole(new Role(1,"ROLE_USER"));
        var invite=new GuideInvitation();invite.setGuideId(4L);invite.setStatus("PENDING");invite.setTokenHash("synthetic-digest");when(invitations.findById(4L)).thenReturn(Optional.of(invite));
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(roles.findByName("ROLE_GUIDE")).thenReturn(Optional.of(new Role(3,"ROLE_GUIDE")));when(roles.findByName("ROLE_USER")).thenReturn(Optional.of(new Role(1,"ROLE_USER")));
        service.link("admin",4L,new GuideWorkspaceService.LinkAccount(user.getEmail()));assertEquals("ROLE_GUIDE",user.getRole().getName());assertEquals(1L,user.getAuthVersion());
        assertEquals("REVOKED",invite.getStatus());assertNull(invite.getTokenHash());
        service.link("admin",4L,new GuideWorkspaceService.LinkAccount(null));assertNull(guide.getUser());assertEquals("ROLE_USER",user.getRole().getName());assertEquals(2L,user.getAuthVersion());
    }
}
