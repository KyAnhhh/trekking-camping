package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import java.time.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class ParticipationGate {
    private ParticipationGate() {}
    public static boolean ready(Booking b) {
        return b.getParticipationStatus()==null || "READY".equals(b.getParticipationStatus());
    }
    public static boolean expired(Booking b) {
        return b.getParticipationDeadline()!=null && !b.getParticipationDeadline().isAfter(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }
    public static LocalDateTime deadline(LocalDate departure,int hours) {
        LocalDateTime limit=LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusHours(hours);
        return departure.atStartOfDay().isBefore(limit)?departure.atStartOfDay():limit;
    }
    public static void requirePayment(Booking b) {
        if (!ready(b)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cần hoàn tất khai báo và xem xét yêu cầu tham gia trước khi thanh toán.");
        if (expired(b)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Thời hạn giữ chỗ đã hết. Vui lòng tạo đơn mới hoặc liên hệ người phụ trách.");
    }
}
