package com.trekkingcamping.backend.module.booking.repository;
import com.trekkingcamping.backend.module.booking.entity.PassengerAttendanceAudit;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
public interface PassengerAttendanceAuditRepository extends JpaRepository<PassengerAttendanceAudit,Long> {
    @EntityGraph(attributePaths={"passenger","guide"})
    Page<PassengerAttendanceAudit> findByBookingIdOrderByIdDesc(Long bookingId,Pageable page);
}
