package com.trekkingcamping.backend.config;

import com.trekkingcamping.backend.module.booking.websocket.BookingWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final BookingWebSocketHandler bookingWebSocketHandler;

    public WebSocketConfig(BookingWebSocketHandler bookingWebSocketHandler) {
        this.bookingWebSocketHandler = bookingWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(bookingWebSocketHandler, "/ws/booking")
                .setAllowedOriginPatterns("*"); // Support CORS from Vite React on port 5173
    }
}
