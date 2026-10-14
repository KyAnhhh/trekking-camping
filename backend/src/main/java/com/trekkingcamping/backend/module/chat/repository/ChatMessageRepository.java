package com.trekkingcamping.backend.module.chat.repository;

import com.trekkingcamping.backend.module.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop40BySessionIdOrderByCreatedAtDescIdDesc(String sessionId);
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    List<ChatMessage> findTop6BySessionIdOrderByCreatedAtDescIdDesc(String sessionId);
}
