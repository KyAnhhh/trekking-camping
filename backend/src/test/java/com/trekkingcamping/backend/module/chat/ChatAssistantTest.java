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
    TourKnowledgeContent content=mock(TourKnowledgeContent.class);
    ChatAssistant assistant=new ChatAssistant(sessions,model,vector,catalog,tours,new ObjectMapper().findAndRegisterModules(),mock(com.trekkingcamping.backend.module.guide.service.GuideChatContext.class),content);
    ChatRequestDto request=new ChatRequestDto();ChatSessions.Turn turn;
    ChatAssistantTest() {
        request.setSessionId("session");request.setSessionToken("secret");request.setMessage("Need a tour");
        var user=new User();user.setId(12L);turn=new ChatSessions.Turn("session",1,user,List.of());
        when(sessions.begin(any(),any(),any())).thenReturn(turn);
    }
    @AfterEach void close() { assistant.close(); }
    @Test void tripToolUsesSessionOwnerAndRejectsExtraOwnerArgument() {
        var preparation=mock(com.trekkingcamping.backend.module.booking.service.TripPreparationService.class);assistant.setPreparation(preparation);
        var view=new com.trekkingcamping.backend.module.booking.service.TripPreparationService.View(3L,"Trip","CONFIRMED",null,null,null,null,null,List.of());
        when(preparation.forAssistant(12L,3L)).thenReturn(view);
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{
            BiFunction<String,Map<String,Object>,Object> dispatch=c.getArgument(3);
            assertTrue(((Map<?,?>)dispatch.apply("get_my_trip_preparation",Map.of("bookingId",3,"userId",99))).containsKey("error"));
            assertEquals(view,((Map<?,?>)dispatch.apply("get_my_trip_preparation",Map.of("bookingId",3))).get("trip"));
            return "Booking source has no pickup details.";
        });
        assistant.chat(request,"owner");verify(preparation,times(1)).forAssistant(12L,3L);
    }
    @Test void guestTripToolDoesNotReadBooking() {
        var preparation=mock(com.trekkingcamping.backend.module.booking.service.TripPreparationService.class);assistant.setPreparation(preparation);
        when(sessions.begin(any(),any(),any())).thenReturn(new ChatSessions.Turn("guest",1,null,List.of()));
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{BiFunction<String,Map<String,Object>,Object> dispatch=c.getArgument(3);assertTrue(((Map<?,?>)dispatch.apply("get_my_trip_preparation",Map.of("bookingId",3))).containsKey("error"));return "Please log in.";});
        assistant.chat(request,null);verifyNoInteractions(preparation);
    }
    @Test void followupRetrievalUsesUserContextAndHistoryIsNotCurrentEvidence() {
        var previous=new com.trekkingcamping.backend.module.chat.entity.ChatMessage();previous.setSender("USER");previous.setMessage("Tôi muốn đi Bidoup");
        var bot=new com.trekkingcamping.backend.module.chat.entity.ChatMessage();bot.setSender("BOT");bot.setMessage("Nội dung cũ");
        turn=new ChatSessions.Turn("session",1,turn.owner(),List.of(previous,bot));when(sessions.begin(any(),any(),any())).thenReturn(turn);
        request.setMessage("tour đó cần mang gì?");
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{
            assertTrue(((String)c.getArgument(0)).contains("không chứng minh nội dung tour còn đúng"));
            assertTrue(((String)c.getArgument(1)).contains("USER: Tôi muốn đi Bidoup"));return "Chưa có thông tin trang bị";
        });
        assistant.chat(request,"owner");
        verify(vector).similaritySearch(argThat((org.springframework.ai.vectorstore.SearchRequest q)->q.getQuery().contains("Bidoup")));
    }
    @Test void staleTourIsExcludedEvenWhenValidTextSourcesExist() {
        var t=new com.trekkingcamping.backend.module.tour.entity.Tour();t.setId(1L);t.setIsActive(true);
        when(tours.findById(1L)).thenReturn(Optional.of(t));
        when(content.snapshot(t)).thenReturn(new TourKnowledgeContent.Snapshot("current","new"));
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(
            new Document("Old itinerary",Map.of("category","TOUR_INFO","tour_id",1,"content_version",TourKnowledgeContent.VERSION,"content_fingerprint","old")),
            new Document("Equipment advice",Map.of("source_file","guide.txt"))));
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{
            String prompt=c.getArgument(1);assertFalse(prompt.contains("Old itinerary"));assertTrue(prompt.contains("Equipment advice"));return "Advice [S1]";
        });
        var answer=assistant.chat(request,"owner");assertEquals(1,answer.sources().size());assertTrue(answer.notices().stream().anyMatch(n->n.contains("tour cũ")));
    }
    @Test void matchingFingerprintAcceptedButLegacyAndInactiveToursExcluded() {
        var t=new com.trekkingcamping.backend.module.tour.entity.Tour();t.setId(1L);t.setIsActive(true);
        when(tours.findById(1L)).thenReturn(Optional.of(t));when(content.snapshot(t)).thenReturn(new TourKnowledgeContent.Snapshot("current","hash"));
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(
            new Document("valid",Map.of("category","TOUR_INFO","tour_id",1,"content_version",TourKnowledgeContent.VERSION,"content_fingerprint","hash")),
            new Document("legacy",Map.of("category","TOUR_INFO","tour_id",1,"tour_updated_at","old")),
            new Document("deleted",Map.of("category","TOUR_INFO","tour_id",2))));
        when(model.converse(any(),any(),anyList(),any())).thenReturn("Answer [S1]");
        assertEquals(1,assistant.chat(request,"owner").sources().size());verify(content,times(1)).snapshot(t);
        t.setIsActive(false);when(model.converse(any(),any(),anyList(),any())).thenReturn("Chưa có nguồn hiện tại");
        assertTrue(assistant.chat(request,"owner").sources().isEmpty());
    }
    @Test void invalidSearchCannotReuseEarlierOptionsOrProposal() {
        when(catalog.search(any(),eq(12L))).thenReturn(List.of(option()));
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{
            BiFunction<String,Map<String,Object>,Object> tool=c.getArgument(3);
            tool.apply("search_tours",Map.of("people",2));tool.apply("propose_booking",Map.of("scheduleId",2,"people",2));
            tool.apply("search_tours",Map.of("people",-1));
            assertTrue(((Map<?,?>)tool.apply("propose_booking",Map.of("scheduleId",2,"people",2))).containsKey("error"));return "Hỏi lại số người";
        });
        var answer=assistant.chat(request,"owner");assertTrue(answer.tours().isEmpty());assertNull(answer.proposal());
    }
    ChatCatalog.Option option() { return new ChatCatalog.Option(1L,2L,"Real tour","/tours/real",LocalDate.now().plusDays(4),LocalDate.now().plusDays(5),BigDecimal.TEN,3,1,false,null); }
    @Test void retrievalFailureIsVisibleAndDoesNotPreventAnswerOrInventSources() {
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenThrow(new IllegalStateException());
        when(model.converse(any(),any(),anyList(),any())).thenReturn("General information only");
        var answer=assistant.chat(request,"owner");assertTrue(answer.sources().isEmpty());assertFalse(answer.notices().isEmpty());
        verify(sessions).finish(turn,request.getMessage(),answer.reply(),answer.sources());verify(sessions).release(turn);
    }
    @Test void unknownCitationIsReplacedByExplicitNoticeNotUnsupportedAdvice() {
        when(model.converse(any(),any(),anyList(),any())).thenReturn("Made up [S99]");
        var answer=assistant.chat(request,"owner");
        assertFalse(answer.reply().contains("Made up"));assertFalse(answer.reply().contains("[S99]"));
        assertTrue(answer.reply().contains("chưa có câu trả lời"));assertFalse(answer.notices().isEmpty());assertNull(answer.proposal());
        verify(sessions).finish(turn,request.getMessage(),answer.reply(),answer.sources());verify(sessions).release(turn);
        verify(model).converse(any(),contains("MÃ NGUỒN RAG ĐƯỢC PHÉP TRONG LƯỢT NÀY: []"),anyList(),any());
    }
    @Test void sourcesKeepMetadataAndUnfilteredInitialOptionsAreNotPresentedAsRecommendations() {
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(new Document("Relevant",Map.of("source_file","guide.txt","visibility","PUBLIC","ingested_at","2026-10-11"))));
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
    @Test void publicExcerptsDistinguishCitationsFromRetrievalAndHidePrivateDocuments() {
        when(vector.similaritySearch(any(org.springframework.ai.vectorstore.SearchRequest.class))).thenReturn(List.of(
            new Document("Private content",Map.of("visibility","PRIVATE")),
            new Document("Public excerpt",Map.of("visibility","PUBLIC","source_file","C:/internal/guide.txt")),
            new Document("Legacy knowledge",Map.of("source_file","internal.txt"))));
        when(model.converse(any(),any(),anyList(),any())).thenAnswer(c->{
            assertFalse(((String)c.getArgument(1)).contains("Private content"));return "Advice [S1]";
        });
        var answer=assistant.chat(request,"owner");
        assertEquals(2,answer.sources().size());
        assertEquals("guide.txt",answer.sources().getFirst().label());
        assertEquals("Public excerpt",answer.sources().getFirst().excerpt());
        assertTrue(answer.sources().getFirst().cited());
        assertFalse(answer.sources().get(1).cited());assertNull(answer.sources().get(1).excerpt());
        assertFalse(answer.sources().get(1).label().contains("internal.txt"));
    }
    @Test void streamReturnsEmitterAndStreamsTokensAndFinishesSession() throws Exception {
        when(model.streamConverse(any(),any(),anyList(),any(),any(),any(),any())).thenAnswer(c -> {
            java.util.function.Consumer<String> tokenConsumer = c.getArgument(5);
            java.util.function.Consumer<String> statusConsumer = c.getArgument(6);
            if (statusConsumer != null) statusConsumer.accept("Đang tra cứu...");
            if (tokenConsumer != null) {
                tokenConsumer.accept("Xin ");
                tokenConsumer.accept("chào!");
            }
            return "Xin chào!";
        });
        var emitter = assistant.stream(request, "owner");
        assertNotNull(emitter);
        // Wait briefly for worker to complete
        Thread.sleep(300);
        verify(sessions, atLeastOnce()).finish(eq(turn), eq("Need a tour"), eq("Xin chào!"), anyList());
    }
}
