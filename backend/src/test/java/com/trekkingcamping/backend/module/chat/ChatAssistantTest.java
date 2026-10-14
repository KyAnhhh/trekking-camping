package com.trekkingcamping.backend.module.chat;
import com.trekkingcamping.backend.module.chat.service.*;
import com.trekkingcamping.backend.module.chat.dto.ChatRequestDto;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.document.Document;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.function.BiFunction;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class ChatAssistantTest {
    ChatSessions sessions=mock(ChatSessions.class);ChatService model=mock(ChatService.class);VectorStore vector=mock(VectorStore.class);
    ChatCatalog catalog=mock(ChatCatalog.class);TourRepository tours=mock(TourRepository.class);
    ChatAssistant assistant=new ChatAssistant(sessions,model,vector,catalog,tours,new ObjectMapper().findAndRegisterModules(),mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class));
    ChatRequestDto request=new ChatRequestDto();ChatSessions.Turn turn;
    ChatAssistantTest() {
        request.setSessionId("session");request.setSessionToken("secret");request.setMessage("Need a tour");
        var user=new User();user.setId(12L);turn=new ChatSessions.Turn("session",1,user,List.of());
        when(sessions.begin(any(),any(),any())).thenReturn(turn);
    }
    @AfterEach void close() { assistant.close(); }
    ChatCatalog.Option option() { return new ChatCatalog.Option(1L,2L,"Real tour","/tours/real",LocalDate.now().plusDays(4),LocalDate.now().plusDays(5),BigDecimal.TEN,3,1,false,null); }
    @Test void retrievalFailureIsVisibleAndDoesNotPreventAnswerOrInventSources() {
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenThrow(new IllegalStateException());
        when(model.converse(any(),any(),anyList(),any())).thenReturn("General information only");
        var answer=assistant.chat(request,"owner");assertTrue(answer.sources().isEmpty());assertFalse(answer.notices().isEmpty());
        verify(sessions).finish(turn,request.getMessage(),answer.reply());verify(sessions).release(turn);
    }
    @Test void unknownCitationIsRejectedWithoutSaving() {
        when(model.converse(any(),any(),anyList(),any())).thenReturn("Made up [S99]");
        assertThrows(ResponseStatusException.class,()->assistant.chat(request,"owner"));verify(sessions,never()).finish(any(),any(),any());verify(sessions).release(turn);
    }
    @Test void sourcesKeepMetadataAndUnfilteredInitialOptionsAreNotPresentedAsRecommendations() {
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(new Document("Relevant",Map.of("source_file","guide.txt","ingested_at","2026-10-11"))));
        when(catalog.search(isNull(),eq(12L))).thenReturn(List.of(option()));
        when(model.converse(any(),any(),anyList(),any())).thenReturn("Answer [S1]");
        var answer=assistant.chat(request,"owner");assertEquals("guide.txt",answer.sources().getFirst().label());assertTrue(answer.tours().isEmpty());
    }
    @Test void toolCannotProposeInventedIdOrExecuteWriteAndSearchUsesAuthenticatedUserOnly() {
        when(catalog.search(any(),eq(12L))).thenReturn(List.of(option()));
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(call -> {
            BiFunction<String,Map<String,Object>,Object> tool=call.getArgument(3);
            assertTrue(((Map<?,?>)tool.apply("create_booking",Map.of())).containsKey("error"));
            tool.apply("search_tours",Map.of("people",2));
            assertTrue(((Map<?,?>)tool.apply("propose_booking",Map.of("scheduleId",999,"people",2))).containsKey("error"));
            tool.apply("propose_booking",Map.of("scheduleId",2,"people",2));return "Please confirm in the form";
        });
        var result=assistant.chat(request,"owner");assertEquals(2L,result.proposal().scheduleId());assertEquals(1,result.tours().size());
        verify(catalog).search(argThat(f -> f!=null && f.people()==2),eq(12L));
    }
}
