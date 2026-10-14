package com.trekkingcamping.backend.module.chat.repository;
import com.trekkingcamping.backend.module.chat.entity.ChatBookingDraft;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface ChatBookingDraftRepository extends JpaRepository<ChatBookingDraft,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from ChatBookingDraft d where d.id = :id")
    Optional<ChatBookingDraft> locked(@org.springframework.data.repository.query.Param("id") String id);
}
