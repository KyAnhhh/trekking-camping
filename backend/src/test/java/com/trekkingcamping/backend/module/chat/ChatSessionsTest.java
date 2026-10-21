package com.trekkingcamping.backend.module.chat;
import com.trekkingcamping.backend.module.chat.service.ChatSessions;
import com.trekkingcamping.backend.module.chat.entity.*;
import com.trekkingcamping.backend.module.chat.repository.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class ChatSessionsTest {
    @Test void guestSelectionPersistsAndRejectsStaleBusyAndWrongSecret() {
        var registry=mock(com.trekkingcamping.backend.module.chat.service.AiModels.class);
        when(registry.resolve(anyString(),eq(false))).thenAnswer(i->i.getArgument(0));service.setModels(registry);
        var c=service.create(null);
        assertEquals(0,service.selection(c.sessionId(),c.sessionToken(),null).revision());
        var result=service.select(c.sessionId(),c.sessionToken(),null,"gemma-4-31b-it",0);
        assertEquals(1,result.revision());assertEquals("gemma-4-31b-it",service.selection(c.sessionId(),c.sessionToken(),null).modelId());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.select(c.sessionId(),c.sessionToken(),null,null,0)).getStatusCode().value());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.select(c.sessionId(),"wrong",null,null,1)).getStatusCode().value());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.begin(c.sessionId(),c.sessionToken(),null,0L)).getStatusCode().value());
        var turn=service.begin(c.sessionId(),c.sessionToken(),null,1L);assertEquals("gemma-4-31b-it",turn.modelId());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.select(c.sessionId(),c.sessionToken(),null,null,1)).getStatusCode().value());
        service.release(turn);assertEquals(2,service.select(c.sessionId(),c.sessionToken(),null,null,1).revision());
    }
    @Test void selectionStillRequiresMatchingAccount() {
        user("a@test",1);user("b@test",2);var c=service.create("a@test");
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.selection(c.sessionId(),c.sessionToken(),"b@test")).getStatusCode().value());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.select(c.sessionId(),c.sessionToken(),null,null,0)).getStatusCode().value());
    }
    final ChatSessionRepository sessions=mock(ChatSessionRepository.class);
    final ChatMessageRepository messages=mock(ChatMessageRepository.class);
    final UserRepository users=mock(UserRepository.class);
    final ChatSessions service=new ChatSessions(sessions,messages,users);
    ChatSession saved;
    ChatSessionsTest() {
        when(sessions.save(any())).thenAnswer(i -> { saved=i.getArgument(0);return saved; });
        when(sessions.locked(anyString())).thenAnswer(i -> saved!=null && saved.getId().equals(i.getArgument(0))?Optional.of(saved):Optional.empty());
    }
    void user(String email,long id) { var u=new User();u.setId(id);u.setEmail(email);u.setIsActive(true);when(users.findByEmail(email)).thenReturn(Optional.of(u)); }
    @Test void sourceMetadataRoundTripsAndLegacyHistoryHasNoSources() throws Exception {
        var message=new com.trekkingcamping.backend.module.chat.entity.ChatMessage();
        assertTrue(ChatSessions.sources(message).isEmpty());
        var source=new com.trekkingcamping.backend.module.chat.service.ChatAssistant.Source("S1","guide.txt","2026-10-22","Public excerpt","DOCUMENT",true);
        message.setSourceMetadata(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(List.of(source)));
        assertEquals(List.of(source),ChatSessions.sources(message));
        message.setSourceMetadata("null");assertTrue(ChatSessions.sources(message).isEmpty());
        message.setSourceMetadata("broken");assertTrue(ChatSessions.sources(message).isEmpty());
    }
    @Test void anonymousSpringPrincipalCreatesGuestSession() {
        service.create("anonymousUser");assertNull(saved.getUserId());verifyNoInteractions(users);
    }
    @Test void guessedOrLegacySessionAndWrongGuestSecretCannotReadHistory() {
        var c=service.create(null);
        assertNotEquals(c.sessionToken(),saved.getSecretHash());
        assertThrows(ResponseStatusException.class,()->service.history(c.sessionId(),"wrong",null));
        assertThrows(ResponseStatusException.class,()->service.history(UUID.randomUUID().toString(),c.sessionToken(),null));
        verifyNoInteractions(messages);
    }
    @Test void ownerBindingRejectsOtherUserAndAnonymousEvenWithSecret() {
        user("a@test",1);user("b@test",2);var c=service.create("a@test");
        assertThrows(ResponseStatusException.class,()->service.history(c.sessionId(),c.sessionToken(),"b@test"));
        assertThrows(ResponseStatusException.class,()->service.history(c.sessionId(),c.sessionToken(),null));
        verifyNoInteractions(messages);
        service.history(c.sessionId(),c.sessionToken(),"a@test");verify(messages).findTop40BySessionIdOrderByCreatedAtDescIdDesc(c.sessionId());
    }
    @Test void guestCannotBeAdoptedByLoginAndExpiredSessionFails() {
        user("a@test",1);var c=service.create(null);
        assertThrows(ResponseStatusException.class,()->service.begin(c.sessionId(),c.sessionToken(),"a@test"));
        saved.setExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(ResponseStatusException.class,()->service.history(c.sessionId(),c.sessionToken(),null));
    }
    @Test void activeTurnBlocksParallelAndOldLeaseCannotWriteAfterNewTurn() {
        var c=service.create(null);var first=service.begin(c.sessionId(),c.sessionToken(),null);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.begin(c.sessionId(),c.sessionToken(),null)).getStatusCode().value());
        saved.setBusyUntil(Instant.now().minusSeconds(1));saved.setNextTurnAt(Instant.now().minusSeconds(1));
        var second=service.begin(c.sessionId(),c.sessionToken(),null);
        assertThrows(ResponseStatusException.class,()->service.finish(first,"old","old"));
        service.release(first);assertNotNull(saved.getBusyUntil());
        verify(messages,never()).saveAll(any());
        service.finish(second,"new","answer");verify(messages).saveAll(any());assertNull(saved.getBusyUntil());
    }
}
