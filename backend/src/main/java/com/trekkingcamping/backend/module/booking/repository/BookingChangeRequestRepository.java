package com.trekkingcamping.backend.module.booking.repository;
import com.trekkingcamping.backend.module.booking.entity.BookingChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;
import java.util.*;
public interface BookingChangeRequestRepository extends JpaRepository<BookingChangeRequest,Long> {
 List<BookingChangeRequest> findByBookingIdOrderByIdDesc(Long bookingId);
 boolean existsByBookingIdAndStatus(Long bookingId,String status);
 Page<BookingChangeRequest> findByStatusOrderByIdDesc(String status,Pageable page);
}
