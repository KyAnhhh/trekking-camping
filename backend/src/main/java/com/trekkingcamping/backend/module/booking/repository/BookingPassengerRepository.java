package com.trekkingcamping.backend.module.booking.repository;
import com.trekkingcamping.backend.module.booking.entity.BookingPassenger;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface BookingPassengerRepository extends JpaRepository<BookingPassenger,Long> {
    List<BookingPassenger> findByBookingIdOrderByPositionAsc(Long id);
    List<BookingPassenger> findByBookingIdIn(List<Long> ids);
    boolean existsByBookingId(Long id);
}
