package com.trekkingcamping.backend.module.notification.repository;
import com.trekkingcamping.backend.module.notification.entity.Notification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.time.Instant;
import java.util.*;
public interface NotificationRepository extends JpaRepository<Notification,Long> {
    Page<Notification> findByUserIdOrderByIdDesc(Long userId,Pageable page);
    long countByUserIdAndReadAtIsNull(Long userId);
    @Modifying @Query("update Notification n set n.readAt=:now where n.id=:id and n.user.id=:userId and n.readAt is null")
    int read(@Param("id") Long id,@Param("userId") Long userId,@Param("now") Instant now);
    @Modifying @Query("update Notification n set n.readAt=:now where n.user.id=:userId and n.readAt is null")
    int readAll(@Param("userId") Long userId,@Param("now") Instant now);
    // The only lock held during SMTP is this outbox row, never a booking/schedule row.
    @Query(value="select * from notifications where email_status in ('PENDING','RETRY') and next_attempt_at <= :now order by id limit 1 for update skip locked",nativeQuery=true)
    Optional<Notification> nextMail(@Param("now") Instant now);
}
