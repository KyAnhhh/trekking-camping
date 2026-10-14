package com.trekkingcamping.backend.module.chat.repository;
import com.trekkingcamping.backend.module.chat.entity.ChatSession;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface ChatSessionRepository extends JpaRepository<ChatSession,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ChatSession s where s.id = :id")
    Optional<ChatSession> locked(@org.springframework.data.repository.query.Param("id") String id);
}
