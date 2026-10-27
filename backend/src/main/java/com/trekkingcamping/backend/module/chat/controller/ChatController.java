package com.trekkingcamping.backend.module.chat.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.chat.service.DataIngestionService;
import org.springframework.web.bind.annotation.*;
import com.trekkingcamping.backend.module.chat.service.ChatAssistant;
import com.trekkingcamping.backend.module.chat.service.ChatSessions;
import com.trekkingcamping.backend.module.chat.service.ChatBookingService;
import com.trekkingcamping.backend.module.chat.service.ChatRateLimit;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatAssistant chatService;
    private final ChatSessions sessions;
    private final ChatBookingService bookings;
    private final ChatRateLimit limits;
    private final DataIngestionService dataIngestionService;

    public ChatController(ChatAssistant chatService, DataIngestionService dataIngestionService,
            ChatSessions sessions,ChatBookingService bookings,ChatRateLimit limits) {
        this.chatService = chatService;
        this.dataIngestionService = dataIngestionService;
        this.sessions=sessions;this.bookings=bookings;this.limits=limits;
    }

    // API nạp dữ liệu Tour từ DB vào Vector Store
    @PostMapping("/ingest-tours")
    public ApiResponse<String> ingestTours() {
        int count = dataIngestionService.ingestTourDataToVectorStore();
        ApiResponse<String> response = new ApiResponse<>();
        response.setData("Đã nạp thành công " + count + " tour vào Vector Store!");
        return response;
    }

    // API nhắn tin với AI Chatbot RAG
    @PostMapping
    public ApiResponse<ChatAssistant.Answer> chat(@RequestBody ChatRequestDto request,@AuthenticationPrincipal String email,HttpServletRequest http) {
        limits.check(http.getRemoteAddr(),"chat",20);
        ApiResponse<ChatAssistant.Answer> response = new ApiResponse<>();
        response.setData(chatService.chat(request,email));
        return response;
    }

    // API nhắn tin SSE Streaming với AI Chatbot
    @PostMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter stream(
            @RequestBody ChatRequestDto request,
            @AuthenticationPrincipal String email,
            HttpServletRequest http) {
        limits.check(http.getRemoteAddr(), "chat", 20);
        return chatService.stream(request, email);
    }

    @PostMapping("/sessions")
    public ApiResponse<ChatSessions.Credentials> createSession(@AuthenticationPrincipal String email,HttpServletRequest http) {
        limits.check(http.getRemoteAddr(),"sessions",10);
        var r=new ApiResponse<ChatSessions.Credentials>();r.setData(sessions.create(email));return r;
    }
    public record HistoryRequest(String sessionId,String sessionToken) {}
    public record Message(String sender,String message,String modelId,java.util.List<ChatAssistant.Source> sources) {}
    public record SettingsRequest(String sessionToken,String modelId,long revision) {}
    @PostMapping("/sessions/{id}/state")
    public ApiResponse<ChatSessions.Selection> state(@PathVariable String id,@RequestBody SettingsRequest input,@AuthenticationPrincipal String email) {
        ApiResponse<ChatSessions.Selection> response = new ApiResponse<>();
        response.setData(sessions.selection(id,input.sessionToken(),email));
        return response;
    }
    @PatchMapping("/sessions/{id}/settings")
    public ApiResponse<ChatSessions.Selection> settings(@PathVariable String id,@RequestBody SettingsRequest input,@AuthenticationPrincipal String email) {
        ApiResponse<ChatSessions.Selection> response = new ApiResponse<>();
        response.setData(sessions.select(id,input.sessionToken(),email,input.modelId(),input.revision()));
        return response;
    }
    @PostMapping("/history")
    public ApiResponse<java.util.List<Message>> history(@RequestBody HistoryRequest input,@AuthenticationPrincipal String email,HttpServletRequest http) {
        limits.check(http.getRemoteAddr(),"history",60);
        var r=new ApiResponse<java.util.List<Message>>();r.setData(sessions.history(input.sessionId(),input.sessionToken(),email).stream()
                .map(m -> new Message(m.getSender(),m.getMessage(),m.getModelId(),ChatSessions.sources(m))).toList());return r;
    }
    @PostMapping("/booking-drafts")
    public ApiResponse<ChatBookingService.Quote> draft(@RequestBody ChatBookingService.Prepare input,@AuthenticationPrincipal String email,HttpServletRequest http) {
        limits.check(http.getRemoteAddr(),"drafts",20);
        var r=new ApiResponse<ChatBookingService.Quote>();r.setData(bookings.prepare(email,input));return r;
    }
    @PostMapping("/booking-drafts/{id}/confirm")
    public ApiResponse<com.trekkingcamping.backend.module.booking.dto.BookingResponseDto> confirm(@PathVariable String id,
            @RequestBody ChatBookingService.Confirm input,@AuthenticationPrincipal String email) {
        var r=new ApiResponse<com.trekkingcamping.backend.module.booking.dto.BookingResponseDto>();r.setData(bookings.confirm(email,id,input));return r;
    }
}
