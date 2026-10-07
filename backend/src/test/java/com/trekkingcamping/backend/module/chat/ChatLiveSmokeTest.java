package com.trekkingcamping.backend.module.chat;

import com.trekkingcamping.backend.config.GeminiProperties;
import com.trekkingcamping.backend.config.LocalEnvironment;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.chat.repository.ChatMessageRepository;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.ai.vectorstore.VectorStore;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyList;

/** Opt-in only: one real provider request, synthetic prompt, no application data or DB. */
@EnabledIfSystemProperty(named = "gemini.live", matches = "true")
class ChatLiveSmokeTest {
    @Test
    void configuredChatServiceReturnsVisibleReply() {
        LocalEnvironment.load();
        var config = new GeminiProperties();
        config.setApiKey(System.getenv("GEMINI_API_KEY") != null ? System.getenv("GEMINI_API_KEY") : System.getProperty("GEMINI_API_KEY"));
        config.setMaxAttempts(1);
        var repository = mock(ChatMessageRepository.class);
        var service = new ChatService(mock(VectorStore.class), repository, config, mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class), mock(com.trekkingcamping.backend.module.chat.service.TourChatContext.class));
        var request = new ChatRequestDto();
        request.setMessage("Xin chào. Hãy trả lời một câu chào ngắn bằng tiếng Việt.");
        var reply = service.processChat(request);
        assertNotNull(reply.getSessionId());
        assertFalse(reply.getReply().isBlank());
        verify(repository).saveAll(anyList());
    }
}
