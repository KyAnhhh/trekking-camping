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
