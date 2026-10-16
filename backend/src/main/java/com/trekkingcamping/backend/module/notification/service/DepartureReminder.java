package com.trekkingcamping.backend.module.notification.service;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
@Service
public class DepartureReminder {
    private final BookingRepository bookings;private final NotificationService notifications;private final EntityManager em;
    public DepartureReminder(BookingRepository bookings,NotificationService notifications,EntityManager em) {this.bookings=bookings;this.notifications=notifications;this.em=em;}
    @Transactional public void remind(Long id) {
        var b=bookings.findByIdForUpdate(id).orElse(null);if(b==null)return;em.refresh(b);
        var tomorrow=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        if(!"CONFIRMED".equals(b.getStatus()) || !tomorrow.equals(b.getSchedule().getDepartureDate()) || "CANCELLED".equals(b.getSchedule().getStatus()))return;
        notifications.booking(b,"REMINDER:"+tomorrow,"Chuyến đi khởi hành ngày mai","Vui lòng kiểm tra giờ/điểm đón, liên hệ hướng dẫn viên và chuẩn bị đầy đủ trang bị trong chi tiết đơn.");
    }
}
