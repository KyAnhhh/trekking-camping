package com.trekkingcamping.backend.module.guide;
import com.trekkingcamping.backend.module.guide.service.GuideReportService;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GuideReportTest {
 GuideRepository guides=mock(GuideRepository.class);ScheduleGuideRepository assignments=mock(ScheduleGuideRepository.class);TourScheduleRepository schedules=mock(TourScheduleRepository.class);UserRepository users=mock(UserRepository.class);JdbcTemplate jdbc=mock(JdbcTemplate.class);NotificationService notices=mock(NotificationService.class);EntityManager em=mock(EntityManager.class);
 GuideReportService service=new GuideReportService(guides,assignments,schedules,users,jdbc,notices,em);Guide g;TourSchedule s;User u;
 GuideReportService.Input input=new GuideReportService.Input("Summary","No incidents","Suggestions");
 @BeforeEach void setup(){u=new User();u.setId(1L);u.setIsActive(true);Role role=new Role();role.setName("ROLE_GUIDE");u.setRole(role);g=new Guide();g.setId(2L);g.setActive(true);g.setUser(u);s=new TourSchedule();s.setId(3L);s.setStatus("CLOSED");s.setReturnDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1));when(users.findByEmail("guide")).thenReturn(Optional.of(u));when(guides.findByUserId(1L)).thenReturn(Optional.of(g));when(guides.lockById(2L)).thenReturn(Optional.of(g));when(schedules.findByIdForUpdate(3L)).thenReturn(Optional.of(s));when(assignments.existsByScheduleIdAndGuideId(3L,2L)).thenReturn(true);}
 @Test void unassignedGuideRejected(){when(assignments.existsByScheduleIdAndGuideId(3L,2L)).thenReturn(false);assertThrows(ResponseStatusException.class,()->service.submit("guide",3L,input));}
 @Test void futureTripRejected(){s.setReturnDate(LocalDate.now().plusDays(1));assertThrows(ResponseStatusException.class,()->service.submit("guide",3L,input));}
 @Test void cancelledTripRejected(){s.setStatus("CANCELLED");assertThrows(ResponseStatusException.class,()->service.submit("guide",3L,input));}
 @Test void duplicateDoesNotOverwrite(){when(jdbc.queryForList(anyString(),eq(3L),eq(2L))).thenReturn(List.of(Map.of("id",8L)));assertThrows(ResponseStatusException.class,()->service.submit("guide",3L,input));}
 @Test void reportValidation(){assertThrows(IllegalArgumentException.class,()->service.submit("guide",3L,new GuideReportService.Input(" ","x","y")));}
 @Test void guideCannotReadAdminQueue(){assertThrows(ResponseStatusException.class,()->service.list("guide",0));}
 @Test void ownReportReadIsGuideScoped(){service.mine("guide",3L);verify(jdbc).queryForList(contains("guide_id=?"),eq(3L),eq(2L));}
 @Test void submitUsesLockedAssignment(){service.submit("guide",3L,input);verify(schedules).findByIdForUpdate(3L);verify(guides).lockById(2L);verify(jdbc).queryForObject(contains("INSERT INTO guide_trip_reports"),eq(Long.class),eq(3L),eq(2L),eq("Summary"),eq("No incidents"),eq("Suggestions"));}
}
