package com.trekkingcamping.backend.module.guide.repository;
import com.trekkingcamping.backend.module.guide.entity.BookingAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface BookingAttendanceRepository extends JpaRepository<BookingAttendance,Long> {
    List<BookingAttendance> findByBookingIdIn(Collection<Long> ids);
}
