package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
@RestController
@RequestMapping("/api/admin/guide-assignments")
public class GuideAssignmentAdminController {
 private final JdbcTemplate jdbc;
 public GuideAssignmentAdminController(JdbcTemplate jdbc){this.jdbc=jdbc;}
 @GetMapping public ApiResponse<?> list(@RequestParam(defaultValue="0") int page) {
  if(page<0||page>10000)throw new IllegalArgumentException("Trang không hợp lệ");
  var rows=jdbc.queryForList("""
   SELECT s.id,t.title,t.slug,s.departure_date,s.return_date,
    count(a.id) AS assigned,
    count(a.id) FILTER(WHERE a.response_status='PENDING') AS pending,
    count(a.id) FILTER(WHERE a.response_status='DECLINED') AS declined,
    count(a.id) FILTER(WHERE a.response_status IN ('ACCEPTED','LEGACY')) AS accepted,
    count(a.id) FILTER(WHERE a.role='LEAD' AND a.response_status IN ('ACCEPTED','LEGACY')) AS confirmed_leads,
    count(a.id) FILTER(WHERE a.id IS NOT NULL AND (g.user_id IS NULL OR u.is_active IS NOT TRUE OR r.name<>'ROLE_GUIDE')) AS unlinked
   FROM tour_schedules s JOIN tours t ON t.id=s.tour_id
   LEFT JOIN schedule_guides a ON a.schedule_id=s.id LEFT JOIN guides g ON g.id=a.guide_id
   LEFT JOIN users u ON u.id=g.user_id LEFT JOIN roles r ON r.id=u.role_id
   WHERE s.departure_date>(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND s.status<>'CANCELLED'
   GROUP BY s.id,t.title,t.slug ORDER BY s.departure_date,s.id LIMIT 21 OFFSET ?
   """,page*20);
  return new ApiResponse<>(1000,"Thành công",Map.of("items",rows.stream().limit(20).toList(),"hasNext",rows.size()>20,"page",page));
 }
 @GetMapping("/{id}/history") public ApiResponse<?> history(@PathVariable long id) {
  return new ApiResponse<>(1000,"Thành công",jdbc.queryForList("SELECT guide_id,actor,action,reason,created_at FROM guide_assignment_events WHERE schedule_id=? ORDER BY id DESC LIMIT 100",id));
 }
}
