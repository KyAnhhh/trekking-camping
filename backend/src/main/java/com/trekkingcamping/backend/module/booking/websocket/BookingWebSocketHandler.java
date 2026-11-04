package com.trekkingcamping.backend.module.booking.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class BookingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(BookingWebSocketHandler.class);
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper;

    public BookingWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("[WebSocket] New client connected: id={}, remoteAddress={}. Total active: {}",
                session.getId(), session.getRemoteAddress(), sessions.size());
        try {
            String welcome = objectMapper.writeValueAsString(Map.of(
                    "type", "CONNECTED",
                    "sessionId", session.getId(),
                    "timestamp", System.currentTimeMillis()
            ));
            session.sendMessage(new TextMessage(welcome));
        } catch (IOException e) {
            log.warn("[WebSocket] Failed to send welcome to {}: {}", session.getId(), e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("[WebSocket] Client disconnected: id={}, status={}. Total active: {}",
                session.getId(), status, sessions.size());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("[WebSocket] Transport error for session {}: {}", session.getId(), exception.getMessage());
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Echo or handle client ping/heartbeat
        String payload = message.getPayload();
        if ("ping".equalsIgnoreCase(payload.trim())) {
            try {
                session.sendMessage(new TextMessage("pong"));
            } catch (IOException ignored) {}
        }
    }

    /**
     * Broadcast an event to all connected clients.
     *
     * @param type    Event type, e.g. "NEW_BOOKING", "BOOKING_APPROVED", "PAYMENT_SUCCESS", "SLOTS_UPDATED"
     * @param payload Event data payload
     */
    public void broadcast(String type, Object payload) {
        if (sessions.isEmpty()) {
            log.debug("[WebSocket] No active clients to broadcast event {}", type);
            return;
        }

        try {
            Map<String, Object> messageMap = Map.of(
                    "type", type,
                    "data", payload != null ? payload : Map.of(),
                    "timestamp", System.currentTimeMillis()
            );
            String json = objectMapper.writeValueAsString(messageMap);
            TextMessage textMessage = new TextMessage(json);

            log.info("[WebSocket] Broadcasting event {} to {} client(s)", type, sessions.size());
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                    } catch (IOException e) {
                        log.warn("[WebSocket] Error sending message to {}: {}", session.getId(), e.getMessage());
                        sessions.remove(session);
                    }
                } else {
                    sessions.remove(session);
                }
            }
        } catch (Exception e) {
            log.error("[WebSocket] Failed to serialize broadcast event {}: {}", type, e.getMessage(), e);
        }
    }
}
