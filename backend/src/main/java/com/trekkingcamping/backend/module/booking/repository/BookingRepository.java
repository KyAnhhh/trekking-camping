package com.trekkingcamping.backend.module.booking.repository;

import com.trekkingcamping.backend.module.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Query("select distinct b.schedule.tour.id from Booking b where b.user.id = :userId and b.status = 'COMPLETED'")
    List<Long> completedTourIds(@Param("userId") Long userId);
    @Query("""
        select b from Booking b where b.status = 'PENDING' and b.participationDeadline < :deadline
        and not exists (select p.id from PaymentTransaction p where p.booking.id = b.id
            and p.status in ('PENDING','SUCCESS','REFUND_REQUIRED')) order by b.id
        """)
    List<Booking> participationExpiryCandidates(@Param("deadline") java.time.LocalDateTime deadline, org.springframework.data.domain.Pageable page);
    boolean existsByScheduleId(Long scheduleId);
    boolean existsByScheduleIdAndStatusNot(Long scheduleId, String status);
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Booking> findByBookingCode(String bookingCode);
    List<Booking> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);
}
