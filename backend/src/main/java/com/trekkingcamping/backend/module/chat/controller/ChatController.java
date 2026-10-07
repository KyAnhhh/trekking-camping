package com.trekkingcamping.backend.module.chat.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.chat.dto.ChatResponseDto;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import com.trekkingcamping.backend.module.chat.service.DataIngestionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final DataIngestionService dataIngestionService;

    public ChatController(ChatService chatService, DataIngestionService dataIngestionService) {
        this.chatService = chatService;
        this.dataIngestionService = dataIngestionService;
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
    public ApiResponse<ChatResponseDto> chat(@RequestBody ChatRequestDto request) {
        ChatResponseDto chatResponse = chatService.processChat(request);
        ApiResponse<ChatResponseDto> response = new ApiResponse<>();
        response.setData(chatResponse);
        return response;
    }
}