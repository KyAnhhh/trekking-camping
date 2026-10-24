package com.trekkingcamping.backend.module.guide.service;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;
import java.util.*;
import java.time.*;
@Service
public class GuideReportService {
 public record Input(String summary,String incidents,String suggestions) {}
 private final GuideRepository guides;private final ScheduleGuideRepository assignments;private final TourScheduleRepository schedules;
 private final UserRepository users;private final JdbcTemplate jdbc;private final NotificationService notifications;private final EntityManager em;
 public GuideReportService(GuideRepository g,ScheduleGuideRepository a,TourScheduleRepository s,UserRepository u,JdbcTemplate j,NotificationService n,EntityManager e){guides=g;assignments=a;schedules=s;users=u;jdbc=j;notifications=n;em=e;}
 @Transactional(readOnly=true) public List<Map<String,Object>> mine(String email,Long schedule){var u=user(email,"ROLE_GUIDE");var g=guides.findByUserId(u.getId()).filter(x->Boolean.TRUE.equals(x.getActive())).orElseThrow(this::missing);return jdbc.queryForList("SELECT * FROM guide_trip_reports WHERE schedule_id=? AND guide_id=?",schedule,g.getId());}
 @Transactional public void submit(String email,Long id,Input input){
  var u=user(email,"ROLE_GUIDE");var g=guides.findByUserId(u.getId()).filter(x->Boolean.TRUE.equals(x.getActive())).orElseThrow(this::missing);
  var s=schedules.findByIdForUpdate(id).orElseThrow(this::missing);em.refresh(s);
  g=guides.lockById(g.getId()).orElseThrow(this::missing);em.refresh(g);
  if(!Boolean.TRUE.equals(g.getActive())||g.getUser()==null||!Objects.equals(g.getUser().getId(),u.getId())||!assignments.existsByScheduleIdAndGuideId(id,g.getId()))throw missing();
  if("CANCELLED".equals(s.getStatus())||s.getReturnDate()==null||!s.getReturnDate().isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))))throw new ResponseStatusException(HttpStatus.CONFLICT,"Báo cáo mở sau ngày kết thúc chuyến đi không bị hủy.");
  if(input==null)throw new IllegalArgumentException("Thiếu báo cáo.");
  String summary=text(input.summary(),4000),incidents=text(input.incidents(),4000),suggestions=text(input.suggestions(),2000);
  if(!jdbc.queryForList("SELECT id FROM guide_trip_reports WHERE schedule_id=? AND guide_id=?",id,g.getId()).isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Báo cáo đã gửi, không ghi đè lịch sử.");
  Long report=jdbc.queryForObject("INSERT INTO guide_trip_reports(schedule_id,guide_id,summary,incidents,suggestions) VALUES(?,?,?,?,?) RETURNING id",Long.class,id,g.getId(),summary,incidents,suggestions);
  for(var admin:users.findByRoleNameAndIsActiveTrue("ROLE_ADMIN"))notifications.emit(admin,"guide-report:"+report,"Có báo cáo sau chuyến đi","Báo cáo mới cần xem xét trong quản trị.","/admin/guide-reports");
 }
 @Transactional(readOnly=true) public Map<String,Object> list(String email,int page){user(email,"ROLE_ADMIN");if(page<0||page>10000)throw new IllegalArgumentException("Trang không hợp lệ.");var rows=jdbc.queryForList("SELECT r.*,g.full_name AS guide_name,t.title FROM guide_trip_reports r JOIN guides g ON g.id=r.guide_id JOIN tour_schedules s ON s.id=r.schedule_id JOIN tours t ON t.id=s.tour_id ORDER BY r.id DESC LIMIT 21 OFFSET ?",page*20);return Map.of("items",rows.stream().limit(20).toList(),"page",page,"hasNext",rows.size()>20);}
 @Transactional public void review(String email,Long id,String note){user(email,"ROLE_ADMIN");note=text(note,2000);int count=jdbc.update("UPDATE guide_trip_reports SET status='REVIEWED',admin_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='SUBMITTED'",note,email,id);if(count==0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Báo cáo không tồn tại hoặc đã được xử lý.");}
 private com.trekkingcamping.backend.module.user.entity.User user(String email,String role){var u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(this::missing);if(u.getRole()==null||!role.equals(u.getRole().getName()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);return u;}
 private String text(String s,int max){if(s==null||s.isBlank()||s.length()>max)throw new IllegalArgumentException("Điền đủ nội dung báo cáo trong giới hạn ký tự.");return s.trim();}
 private ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy phân công phù hợp.");}
}
