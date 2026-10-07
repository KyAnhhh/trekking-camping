package com.trekkingcamping.backend.module.chat;

import com.trekkingcamping.backend.config.GeminiProperties;
import com.trekkingcamping.backend.common.exception.GlobalExceptionHandler;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.chat.repository.ChatMessageRepository;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.SocketTimeoutException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ChatFailureTest {
    private final ChatMessageRepository repository = mock(ChatMessageRepository.class);
    private final GeminiProperties config = new GeminiProperties();
    private final ChatService service;
    private final MockRestServiceServer server;

    ChatFailureTest() {
        config.setApiKey("test-only-key");
        config.setModels(List.of("model-a"));
        config.setMaxAttempts(1);
        service = new ChatService(mock(VectorStore.class), repository, config, mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class), mock(com.trekkingcamping.backend.module.chat.service.TourChatContext.class));
        server = MockRestServiceServer.bindTo(
                (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
    }

    @ParameterizedTest
    @CsvSource({"429,503,quota", "401,503,API key", "403,503,API key",
            "404,503,GEMINI_MODELS", "400,502,cấu hình", "503,503,tạm thời"})
    void providerErrorsAreNotSavedAsAnswers(int providerStatus, int appStatus, String messagePart) {
        server.expect(anything()).andRespond(withStatus(HttpStatus.valueOf(providerStatus))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":{\"message\":\"sensitive-provider-detail\"}}"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertEquals(appStatus, error.getStatusCode().value());
        assertTrue(error.getReason().contains(messagePart));
        assertFalse(error.getReason().contains("sensitive-provider-detail"));
        assertNoWrites();
        var response = new GlobalExceptionHandler().handleStatus(error);
        assertEquals(appStatus, response.getStatusCode().value());
        assertEquals(appStatus, response.getBody().getCode());
        assertEquals(error.getReason(), response.getBody().getMessage());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"candidates\":[]}", "{\"candidates\":[{}]}",
            "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"   \"}]}}]}",
            "{\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"internal\"}]}}]}"})
    void emptyOrMalformedResponseFailsWithoutDatabaseWrites(String body) {
        server.expect(anything()).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertNoWrites();
        server.verify();
    }

    @Test
    void visibleTextPartsAreCombinedAndThoughtsAreExcluded() {
        server.expect(anything())
                .andExpect(jsonPath("$.contents[0].parts[0].text",
                        org.hamcrest.Matchers.containsString("USER: Tôi cần mang gì?")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[
                          {"thought":true,"text":"Internal reasoning"},
                          {"text":"Mang giày "},{"text":"trekking."}
                        ]}}]}
                        """, MediaType.APPLICATION_JSON));
        assertEquals("Mang giày trekking.", service.processChat(request()).getReply());
        verify(repository).saveAll(anyList());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}",
            "{\"candidates\":[{\"finishReason\":\"SAFETY\",\"content\":{\"parts\":[{\"text\":\"partial\"}]}}]}"})
    void blockedResponsesAreNotRetriedWithOtherModels(String body) {
        config.setModels(List.of("model-a", "model-b"));
        server.expect(anything()).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.getStatusCode());
        assertNoWrites();
        server.verify();
    }

    @Test
    void timeoutIsReportedAsGatewayTimeout() {
        server.expect(anything()).andRespond(request -> { throw new SocketTimeoutException("test timeout"); });
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, error.getStatusCode());
        assertNoWrites();
        server.verify();
    }

    @Test
    void authenticationFailureDoesNotAttemptAnotherModel() {
        config.setModels(List.of("model-a", "model-b"));
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertNoWrites();
        server.verify();
    }

    @Test
    void emptyFirstModelCanFallBackToConfiguredSecondModel() {
        config.setMaxAttempts(3);
        config.setModels(List.of("model-a", "model-b"));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-a:generateContent"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-b:generateContent"))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"Valid reply"}]}}]}
                        """, MediaType.APPLICATION_JSON));
        assertEquals("Valid reply", service.processChat(request()).getReply());
        verify(repository).saveAll(anyList());
        server.verify();
    }

    @Test
    void overloadedPrimaryFallsBackAndSavesOnlySuccessfulPair() {
        config.setModels(List.of("model-a", "model-b"));
        config.setMaxAttempts(3);
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-a:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-b:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}", MediaType.APPLICATION_JSON));
        assertEquals("OK", service.processChat(request()).getReply());
        verify(repository, times(1)).saveAll(anyList());
        server.verify();
    }

    @Test
    void transientFailureRetriesButStopsAtConfiguredBudget() {
        config.setMaxAttempts(3);
        server.expect(org.springframework.test.web.client.ExpectedCount.times(3), anything())
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThrows(ResponseStatusException.class, () -> service.processChat(request()));
        assertNoWrites();
        server.verify();
    }

    @Test
    void promptContainsLiveCatalogAndDropsInactiveTourDocuments() {
        var vector = (VectorStore) ReflectionTestUtils.getField(service, "vectorStore");
        var catalog = (com.trekkingcamping.backend.module.chat.service.TourChatContext) ReflectionTestUtils.getField(service, "tourContext");
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(
                new org.springframework.ai.document.Document("ACTIVE_DESCRIPTION", java.util.Map.of("category", "TOUR_INFO", "tour_id", 1L)),
                new org.springframework.ai.document.Document("INACTIVE_DESCRIPTION", java.util.Map.of("category", "TOUR_INFO", "tour_id", 2L)),
                new org.springframework.ai.document.Document("GENERAL_FAQ", java.util.Map.of("source_file", "faq.txt"))));
        when(catalog.current()).thenReturn(new com.trekkingcamping.backend.module.chat.service.TourChatContext.Snapshot(java.util.Set.of("1"), "CURRENT_PRICE_790000"));
        server.expect(anything()).andExpect(jsonPath("$.contents[0].parts[0].text", org.hamcrest.Matchers.allOf(
                org.hamcrest.Matchers.containsString("ACTIVE_DESCRIPTION"),
                org.hamcrest.Matchers.containsString("CURRENT_PRICE_790000"),
                org.hamcrest.Matchers.containsString("GENERAL_FAQ"),
                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("INACTIVE_DESCRIPTION")))))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}", MediaType.APPLICATION_JSON));
        assertEquals("OK", service.processChat(request()).getReply());
        server.verify();
    }

    @Test
    void catalogFailureDoesNotFallBackToStaleTourAvailability() {
        var vector = (VectorStore) ReflectionTestUtils.getField(service, "vectorStore");
        var catalog = (com.trekkingcamping.backend.module.chat.service.TourChatContext) ReflectionTestUtils.getField(service, "tourContext");
        when(catalog.current()).thenThrow(new IllegalStateException("offline"));
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(
                new org.springframework.ai.document.Document("STALE_PRICE_100", java.util.Map.of("category", "TOUR_INFO", "tour_id", 1L))));
        server.expect(anything()).andExpect(jsonPath("$.contents[0].parts[0].text", org.hamcrest.Matchers.allOf(
                org.hamcrest.Matchers.containsString("Không đọc được danh mục"),
                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("STALE_PRICE_100")))))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Chưa kiểm tra được\"}]}}]}", MediaType.APPLICATION_JSON));
        assertEquals("Chưa kiểm tra được", service.processChat(request()).getReply());
        server.verify();
    }

    private void assertNoWrites() {
        verify(repository, never()).save(any());
        verify(repository, never()).saveAll(any());
    }

    private ChatRequestDto request() {
        ChatRequestDto request = new ChatRequestDto();
        request.setMessage("Tôi cần mang gì?");
        request.setSessionId("test-session");
        return request;
    }
}
