package com.trekkingcamping.backend.module.notification.service;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
@Service
public class PreparationReminders {
 private final JdbcTemplate jdbc;private final BookingRepository bookings;private final NotificationService notifications;private final EntityManager em;
 public PreparationReminders(JdbcTemplate j,BookingRepository b,NotificationService n,EntityManager e){jdbc=j;bookings=b;notifications=n;em=e;}
 public List<Long> candidates(long after){return jdbc.queryForList("SELECT id FROM bookings WHERE id>? AND status IN ('PENDING','CONFIRMED') ORDER BY id LIMIT 100",Long.class,after);}
 @Transactional public void remind(Long id){
  var b=bookings.findByIdForUpdate(id).orElse(null);if(b==null)return;em.refresh(b);
  var day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));var s=b.getSchedule();
  if(!Set.of("PENDING","CONFIRMED").contains(b.getStatus())||"CANCELLED".equals(s.getStatus())||s.getDepartureDate()==null||!s.getDepartureDate().isAfter(day)||s.getDepartureDate().isAfter(day.plusDays(3)))return;
  String key=s.getId()+":"+s.getDepartureDate();
  if("CONFIRMED".equals(b.getStatus())&&s.getDepartureDate().equals(day.plusDays(3)))notifications.booking(b,"PREPARE:"+key,"Chuẩn bị chuyến đi trong 3 ngày tới","Kiểm tra checklist, giờ tập trung và điểm đón trong chi tiết đơn.");
  Long named=jdbc.queryForObject("SELECT count(*) FROM booking_passengers WHERE booking_id=?",Long.class,id);
  if(named!=null&&named<b.getNumberOfPax())notifications.booking(b,"PASSENGER_MISSING:"+key,"Cần hoàn thiện danh sách hành khách","Vui lòng nhập đủ tên hành khách trong chi tiết đơn trước chuyến đi.");
 }
}
