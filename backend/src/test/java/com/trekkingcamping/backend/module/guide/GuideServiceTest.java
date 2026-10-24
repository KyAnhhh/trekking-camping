package com.trekkingcamping.backend.module.guide;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.guide.dto.GuideDtos.*;
import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.guide.service.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class GuideServiceTest {
    GuideRepository guides = mock(GuideRepository.class);
    ScheduleGuideRepository assignments = mock(ScheduleGuideRepository.class);
    TourScheduleRepository schedules = mock(TourScheduleRepository.class);
    TourRepository tours = mock(TourRepository.class);
    GuideImageStorage images = mock(GuideImageStorage.class);
    EntityManager em = mock(EntityManager.class);
    GuideService service = new GuideService(guides, assignments, schedules, tours, images, em, org.mockito.Mockito.mock(com.trekkingcamping.backend.module.notification.service.NotificationService.class));
    Guide guide; TourSchedule schedule;
    @BeforeEach void setup() {
        guide = new Guide(); guide.setId(1L); guide.setCode("HDV_01"); guide.setFullName("Hướng dẫn viên thử nghiệm");
        guide.setPhone("0900000000"); guide.setEmail("guide@example.test");
        Tour tour = new Tour(); tour.setId(1L); tour.setTitle("Tour thử nghiệm"); tour.setIsActive(true);
        schedule = new TourSchedule(); schedule.setId(10L); schedule.setTour(tour); schedule.setStatus("FULL");
        schedule.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10)); schedule.setReturnDate(schedule.getDepartureDate().plusDays(2));
        schedule.setGuideName("Tên cũ"); schedule.setGuidePhone("0911111111");
        when(schedules.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));
        when(schedules.findById(10L)).thenReturn(Optional.of(schedule));
        when(guides.findByCode(guide.getCode())).thenReturn(Optional.of(guide));
        when(guides.lockById(1L)).thenReturn(Optional.of(guide));
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of());
    }
    List<Assignment> team() { return List.of(new Assignment("HDV_01", "LEAD")); }
    @Test void sameAssignmentRetainsResponseAndIdentity() {
        var a=new ScheduleGuide(schedule,guide,"LEAD");a.respond("ACCEPTED",null);
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of(a));
        assertEquals("ACCEPTED",service.assign(10L,team()).guides().getFirst().responseStatus());
        verify(assignments).deleteAll(List.of());verify(assignments).saveAll(List.of(a));verify(em,never()).persist(any());
    }
    @Test void newAssignmentWaitsForGuideAndPublicHidesPending() {
        assertEquals("PENDING",service.assign(10L,team()).guides().getFirst().responseStatus());
        var a=new ScheduleGuide(schedule,guide,"LEAD");a.pending();
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of(a));
        when(tours.findById(1L)).thenReturn(Optional.of(schedule.getTour()));when(schedules.findByTourId(1L)).thenReturn(List.of(schedule));
        assertTrue(service.publicSchedules(1L).getFirst().guides().isEmpty());
        assertEquals(1,service.adminSchedules(1L).getFirst().guides().size());
    }
    @Test void locksAndRefreshesBeforeCheckingConflictAndReplacingLegacy() {
        service.assign(10L, team());
        var order = inOrder(guides, em, assignments);
        order.verify(assignments).forSchedules(List.of(10L));
        order.verify(guides).findByCode("HDV_01"); order.verify(guides).lockById(1L); order.verify(em).refresh(guide);
        order.verify(assignments).countConflicts(eq(1L), eq(10L), eq(schedule.getDepartureDate()), eq(schedule.getReturnDate()));
        order.verify(assignments).deleteAll(anyList()); order.verify(assignments).flush(); order.verify(assignments).saveAll(anyList());
        assertNull(schedule.getGuideName()); assertNull(schedule.getGuidePhone());
    }
    @Test void overlapDoesNotRemovePreviousAssignments() {
        when(assignments.countConflicts(anyLong(), anyLong(), any(), any())).thenReturn(1L);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.assign(10L, team())).getStatusCode().value());
        verify(assignments, never()).deleteAll(any()); verify(assignments, never()).saveAll(any());
        assertEquals("Tên cũ", schedule.getGuideName());
    }
    @Test void inactiveGuideCannotBeAssignedEvenAfterConcurrentProfileChange() {
        doAnswer(inv -> { guide.setActive(false); return null; }).when(em).refresh(guide);
        assertThrows(ResponseStatusException.class, () -> service.assign(10L, team()));
        verify(assignments, never()).saveAll(any());
    }
    @Test void invalidTeamsFailBeforeAnyDatabaseAccess() {
        for (List<Assignment> team : List.of(List.of(new Assignment("HDV_01", "ASSISTANT")),
                List.of(new Assignment("HDV_01", "LEAD"), new Assignment("HDV_01", "ASSISTANT")),
                List.of(new Assignment("HDV_01", "LEAD"), new Assignment("HDV_02", "LEAD")))) {
            assertThrows(IllegalArgumentException.class, () -> service.assign(10L, team));
        }
        verifyNoInteractions(schedules);
    }
    @Test void completedOrCancelledTripsCannotBeRewritten() {
        schedule.setStatus("CANCELLED"); assertThrows(ResponseStatusException.class, () -> service.assign(10L, team()));
        schedule.setStatus("OPEN"); schedule.setDepartureDate(LocalDate.now().minusDays(5));
        assertThrows(ResponseStatusException.class, () -> service.assign(10L, team()));
        verify(assignments, never()).saveAll(any());
    }
    @Test void emptyAssignmentClearsTeamButStillLocksFormerGuide() {
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of(new ScheduleGuide(schedule, guide, "LEAD")));
        assertTrue(service.assign(10L, List.of()).guides().isEmpty());
        verify(guides).lockById(1L); verify(assignments).saveAll(List.of());
    }
    @Test void guidesAreLockedInIdOrderRegardlessOfSubmittedOrder() {
        Guide second = new Guide(); second.setId(2L); second.setCode("HDV_02"); second.setFullName("Guide 2");
        when(guides.findByCode("HDV_02")).thenReturn(Optional.of(second)); when(guides.lockById(2L)).thenReturn(Optional.of(second));
        service.assign(10L, List.of(new Assignment("HDV_02", "LEAD"), new Assignment("HDV_01", "ASSISTANT")));
        var order = inOrder(guides); order.verify(guides).lockById(1L); order.verify(guides).lockById(2L);
    }
    @Test void publicScheduleAndProfileNeverSerializeContactDetails() throws Exception {
        when(tours.findById(1L)).thenReturn(Optional.of(schedule.getTour())); when(schedules.findByTourId(1L)).thenReturn(List.of(schedule));
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of(new ScheduleGuide(schedule, guide, "LEAD")));
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(service.publicSchedules(1L));
        assertTrue(json.contains("HDV_01")); assertFalse(json.contains("0900000000")); assertFalse(json.contains("0911111111"));
        assertFalse(json.contains("guidePhone")); assertFalse(json.contains("email"));
    }
    @Test void bookingContactIsOnlyIncludedWhenAuthorized() {
        when(assignments.forSchedules(anyCollection())).thenReturn(List.of(new ScheduleGuide(schedule, guide, "LEAD")));
        assertNull(service.bookingTeam(10L, false).guides().getFirst().phone());
        assertNull(service.bookingTeam(10L, false).legacyGuidePhone());
        assertEquals("0900000000", service.bookingTeam(10L, true).guides().getFirst().phone());
    }
    Edit edit(boolean active) { return new Edit("HDV_01", "Guide", "Bio", 2020, "Trekking", "Tiếng Việt", "0900000000", "guide@example.test", active); }
    @Test void guideWithFutureTripCannotBeDeactivated() {
        when(assignments.countFuture(eq(1L), any())).thenReturn(1L);
        assertThrows(ResponseStatusException.class, () -> service.update(1L, edit(false))); verify(guides, never()).save(any());
    }
    @Test void duplicateCodeAndMalformedProfileAreRejected() {
        when(guides.existsByCode("HDV_01")).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.create(edit(true)));
        assertThrows(IllegalArgumentException.class, () -> service.create(new Edit("bad code", "", null, 3000, null, null, null, null, true)));
        verify(guides, never()).save(any());
    }
    @Test void liveGuideContextContainsNoPrivateContactsAndSkipsUnrelatedQuestions() {
        var context = new GuideChatContext(assignments);
        assertEquals("", context.forMessage("Xin chào")); verify(assignments, never()).upcoming(any(), any());
        when(assignments.upcoming(any(), any())).thenReturn(List.of(new ScheduleGuide(schedule, guide, "LEAD")));
        String text = context.forMessage("Ai là hướng dẫn viên?");
        assertTrue(text.contains("Tour thử nghiệm")); assertFalse(text.contains("0900000000")); assertFalse(text.contains("guide@example.test"));
    }
}
