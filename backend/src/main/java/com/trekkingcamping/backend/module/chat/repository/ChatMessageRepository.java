package com.trekkingcamping.backend.module.chat.repository;

import com.trekkingcamping.backend.module.chat.entity.ChatMessage;
import com.trekkingcamping.backend.module.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop40BySessionIdOrderByCreatedAtDescIdDesc(String sessionId);
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    List<ChatMessage> findTop6BySessionIdOrderByCreatedAtDescIdDesc(String sessionId);
    List<ChatMessage> findTop14BySessionIdOrderByCreatedAtDescIdDesc(String sessionId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.user = :user WHERE m.sessionId = :sessionId AND m.user IS NULL")
    int claimSessionMessages(@Param("sessionId") String sessionId, @Param("user") User user);
}
