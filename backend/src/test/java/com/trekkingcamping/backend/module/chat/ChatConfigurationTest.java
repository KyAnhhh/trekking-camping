package com.trekkingcamping.backend.module.chat;

import com.trekkingcamping.backend.config.GeminiProperties;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.chat.entity.ChatMessage;
import com.trekkingcamping.backend.module.chat.repository.ChatMessageRepository;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ChatConfigurationTest {
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(GeminiProperties.class)
    static class TestConfig {}

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(TestConfig.class)
            .withPropertyValues("gemini.api-key=test-only-key");

    @Test
    void omittedModelsUseVerifiedPrimaryAndFallback() {
        runner.run(context -> {
            assertNull(context.getStartupFailure());
            GeminiProperties config = context.getBean(GeminiProperties.class);
            assertEquals(GeminiProperties.DEFAULT_MODELS, config.getModels());
            assertNull(config.configurationIssue());
        });
    }

    @Test
    void emptyPlaceholderModelsHaveDefault() {
        // application.yaml resolves an absent GEMINI_MODELS variable to an empty string.
        runner.withPropertyValues("gemini.models=").run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals(GeminiProperties.DEFAULT_MODELS,
                    context.getBean(GeminiProperties.class).getModels());
        });
    }

    @Test
    void commaSeparatedModelsAreTrimmedAndNormalized() {
        runner.withPropertyValues("gemini.models= models/model-a, model-b, ,models/model-a ")
                .run(context -> assertEquals(List.of("model-a", "model-b"),
                        context.getBean(GeminiProperties.class).getModels()));
    }

    @Test
    void yamlStyleListBinds() {
        runner.withPropertyValues("gemini.models[0]=models/model-a", "gemini.models[1]=model-b")
                .run(context -> assertEquals(List.of("model-a", "model-b"),
                        context.getBean(GeminiProperties.class).getModels()));
    }

    @Test
    void invalidModelDoesNotExposeItsValue() {
        GeminiProperties config = new GeminiProperties();
        config.setApiKey("test-only-key");
        config.setModels(List.of("https://invalid.example/secret"));
        assertEquals("GEMINI_MODELS contains an invalid model identifier", config.configurationIssue());
    }

    @Test
    void missingKeyFailsBeforeDatabaseOrVectorAccess() {
        VectorStore vectorStore = mock(VectorStore.class);
        ChatMessageRepository repository = mock(ChatMessageRepository.class);
        GeminiProperties config = new GeminiProperties();
        ChatService service = new ChatService(vectorStore, repository, config, mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class), mock(com.trekkingcamping.backend.module.chat.service.TourChatContext.class));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.processChat(request()));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verifyNoInteractions(vectorStore, repository);
    }

    @Test
    void missingModelsStillCallsGeminiAndPersistsReply() {
        VectorStore vectorStore = mock(VectorStore.class);
        ChatMessageRepository repository = mock(ChatMessageRepository.class);
        GeminiProperties config = new GeminiProperties();
        config.setApiKey(" test-only-key ");
        config.setModels(List.of());
        ChatService service = new ChatService(vectorStore, repository, config, mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class), mock(com.trekkingcamping.backend.module.chat.service.TourChatContext.class));
        RestTemplate client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        MockRestServiceServer server = MockRestServiceServer.bindTo(client).build();
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/" + GeminiProperties.DEFAULT_MODEL + ":generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "test-only-key"))
                .andExpect(jsonPath("$.contents[0].parts[0].text").isString())
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"Chào bạn!"}]}}]}
                        """, MediaType.APPLICATION_JSON));

        var response = service.processChat(request());
        assertEquals("test-session", response.getSessionId());
        assertEquals("Chào bạn!", response.getReply());
        verify(repository).saveAll(argThat(messages -> {
            var pair = new java.util.ArrayList<ChatMessage>();
            messages.forEach(pair::add);
            return pair.size() == 2 && "USER".equals(pair.get(0).getSender())
                    && "BOT".equals(pair.get(1).getSender());
        }));
        server.verify();
    }

    @Test
    void explicitModelFallbackIsPreserved() {
        GeminiProperties config = new GeminiProperties();
        config.setApiKey("test-only-key");
        config.setModels(List.of("models/model-a", "model-b"));
        ChatService service = new ChatService(mock(VectorStore.class), mock(ChatMessageRepository.class), config, mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class), mock(com.trekkingcamping.backend.module.chat.service.TourChatContext.class));
        RestTemplate client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        MockRestServiceServer server = MockRestServiceServer.bindTo(client).build();
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-a:generateContent"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/model-b:generateContent"))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"Fallback reply"}]}}]}
                        """, MediaType.APPLICATION_JSON));
        assertEquals("Fallback reply", service.processChat(request()).getReply());
        server.verify();
    }

    private ChatRequestDto request() {
        ChatRequestDto request = new ChatRequestDto();
        request.setMessage("Tôi nên chuẩn bị gì?");
        request.setSessionId("test-session");
        return request;
    }
}
