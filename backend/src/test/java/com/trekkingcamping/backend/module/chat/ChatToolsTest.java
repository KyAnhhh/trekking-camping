package com.trekkingcamping.backend.module.chat;
import com.trekkingcamping.backend.module.chat.service.*;
import com.trekkingcamping.backend.module.chat.repository.ChatMessageRepository;
import com.trekkingcamping.backend.config.GeminiProperties;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class ChatToolsTest {
    GeminiProperties config=new GeminiProperties();ChatService service;MockRestServiceServer server;
    ChatToolsTest() {
        config.setApiKey("unit-test-only");config.setModels(List.of("test-model"));config.setMaxAttempts(1);
        service=new ChatService(mock(VectorStore.class),mock(ChatMessageRepository.class),config,
                mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class),mock(TourChatContext.class));
        server=MockRestServiceServer.bindTo((RestTemplate)ReflectionTestUtils.getField(service,"restTemplate")).build();
    }
    @Test void readToolRoundTripPreservesSignatureAndUsesSeparateSystemInstruction() {
        server.expect(anything()).andExpect(jsonPath("$.systemInstruction.parts[0].text").value("rules"))
                .andRespond(withSuccess("""
                {"candidates":[{"content":{"role":"model","parts":[{"thoughtSignature":"test-signature","functionCall":{"id":"call-1","name":"search_tours","args":{"people":2}}}]}}]}
                """,MediaType.APPLICATION_JSON));
        server.expect(anything()).andExpect(jsonPath("$.contents[1].parts[0].thoughtSignature").value("test-signature"))
                .andExpect(jsonPath("$.contents[2].parts[0].functionResponse.id").value("call-1"))
                .andRespond(withSuccess("""
                {"candidates":[{"content":{"parts":[{"text":"Grounded answer"}]},"finishReason":"STOP"}]}
                """,MediaType.APPLICATION_JSON));
        String reply=service.converse("rules","question",List.of(),(name,args) -> {
            assertEquals("search_tours",name);assertEquals(2,args.get("people"));return Map.of("tours",List.of());
        });
        assertEquals("Grounded answer",reply);server.verify();
    }
    @Test void truncatedAnswerIsNotReturnedAsSuccessfulBookingAdvice() {
        server.expect(anything()).andRespond(withSuccess("""
                {"candidates":[{"content":{"parts":[{"text":"partial"}]},"finishReason":"MAX_TOKENS"}]}
                """,MediaType.APPLICATION_JSON));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.converse("rules","question",List.of(),(n,a)->Map.of()));
    }
}
