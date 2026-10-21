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
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"gemma-4-31b-it","gemma-4-26b-a4b-it"})
    void selectedGemmaRemainsPinnedAcrossToolsAndTransientRetry(String model) {
        config.setMaxAttempts(2);
        String url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";
        server.expect(requestTo(url)).andExpect(jsonPath("$.systemInstruction.parts[0].text").value("rules"))
            .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingLevel").value("minimal"))
            .andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(requestTo(url)).andRespond(withSuccess("""
            {"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"search_tours","args":{}}}]}}]}
            """,MediaType.APPLICATION_JSON));
        server.expect(requestTo(url)).andExpect(jsonPath("$.contents[2].parts[0].functionResponse.name").value("search_tours"))
            .andRespond(withSuccess("""
            {"candidates":[{"content":{"parts":[{"text":"Không có tour phù hợp."}]},"finishReason":"STOP"}]}
            """,MediaType.APPLICATION_JSON));
        assertEquals("Không có tour phù hợp.",service.converse("rules","question",List.of(),(n,a)->Map.of("tours",List.of()),model));server.verify();
    }
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
    @Test void socketTimeoutIsNotRepeatedWithinChatTurn() {
        config.setMaxAttempts(3);
        server.expect(anything()).andRespond(withException(new java.net.SocketTimeoutException("synthetic")));
        var error=assertThrows(org.springframework.web.server.ResponseStatusException.class,
            ()->service.converse("rules","question",List.of(),(n,a)->Map.of(),"gemma-4-31b-it"));
        assertEquals(504,error.getStatusCode().value());server.verify();
    }
}
