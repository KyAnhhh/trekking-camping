package com.trekkingcamping.backend.module.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.chat.service.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TourKnowledgeTest {
    @Test void fingerprintTracksChildrenAndSafetyWithoutParentTimestampChange() {
        Tour t=tour();var content=new TourKnowledgeContent(itineraries,gears);
        var day=new TourItinerary();day.setDayNumber(1);day.setTitle("Rừng");day.setDescription("Đường cũ");
        when(itineraries.findByTourIdOrderByDayNumberAsc(1L)).thenReturn(List.of(day));
        var before=content.snapshot(t);
        day.setDescription("Đường mới");assertNotEquals(before.fingerprint(),content.snapshot(t).fingerprint());
        var gear=new TourGear();gear.setGearName("Áo mưa");gear.setIsProvided(true);
        var afterDay=content.snapshot(t);
        when(gears.findByTourId(1L)).thenReturn(List.of(gear));
        assertNotEquals(afterDay.fingerprint(),content.snapshot(t).fingerprint());
        var afterGear=content.snapshot(t);t.setSafetyTips("Chỉ đi cùng guide");
        assertNotEquals(afterGear.fingerprint(),content.snapshot(t).fingerprint());
    }
    @Test void fingerprintsAreStableForOrderingAndNumericScaleButExcludeLivePrices() {
        Tour t=tour();var content=new TourKnowledgeContent(itineraries,gears);
        var a=new AdventureProfile();a.setDistanceKm(new BigDecimal("12.0"));t.setAdventureProfile(a);
        var g1=new TourGear();g1.setGearName("A");g1.setRentalPrice(new BigDecimal("10000"));
        var g2=new TourGear();g2.setGearName("B");g2.setIsProvided(true);
        when(gears.findByTourId(1L)).thenReturn(List.of(g1,g2));var first=content.snapshot(t);
        when(gears.findByTourId(1L)).thenReturn(List.of(g2,g1));a.setDistanceKm(new BigDecimal("12.00"));
        t.setPricePerPax(new BigDecimal("990000"));g1.setRentalPrice(new BigDecimal("20000"));
        assertEquals(first.fingerprint(),content.snapshot(t).fingerprint());
        assertFalse(first.text().contains("10000"));
        a.setParticipationRequirements("Yêu cầu mới");assertNotEquals(first.fingerprint(),content.snapshot(t).fingerprint());
    }
    TourRepository tours = mock(TourRepository.class);
    TourScheduleRepository schedules = mock(TourScheduleRepository.class);
    TourItineraryRepository itineraries = mock(TourItineraryRepository.class);
    TourGearRepository gears = mock(TourGearRepository.class);
    VectorStore vector = mock(VectorStore.class);
    JdbcTemplate jdbc = mock(JdbcTemplate.class);

    Tour tour() {
        Tour t = new Tour(); t.setId(1L); t.setTitle("Demo"); t.setSlug("demo");
        t.setPricePerPax(BigDecimal.valueOf(690000)); t.setDifficultyLevel(1); t.setDurationDays(1); t.setDurationNights(0);
        t.setIsActive(true); return t;
    }

    @Test void fullReplacementRemovesOnlyGeneratedTourDocsBeforeAddingActiveCatalog() {
        when(tours.findByIsActiveTrue()).thenReturn(List.of(tour()));
        var sync = new DataIngestionService(vector, tours, new TourKnowledgeContent(itineraries, gears), jdbc);
        assertEquals(1, sync.ingestTourDataToVectorStore());
        assertEquals(1, sync.ingestTourDataToVectorStore());
        var order = inOrder(jdbc, vector);
        for (int i=0; i<2; i++) {
            order.verify(jdbc).queryForList("SELECT pg_advisory_xact_lock(hashtext(?))", "tour-knowledge-sync");
            order.verify(jdbc).update(contains("WHERE metadata->>'category' = ?"), eq("TOUR_INFO"));
            order.verify(vector).add(anyList());
        }
        ArgumentCaptor<List<Document>> documents = ArgumentCaptor.forClass(List.class);
        verify(vector, times(2)).add(documents.capture());
        assertEquals(1L, documents.getValue().getFirst().getMetadata().get("tour_id"));
        assertEquals(TourKnowledgeContent.VERSION,documents.getValue().getFirst().getMetadata().get("content_version"));
        assertNotNull(documents.getValue().getFirst().getMetadata().get("content_fingerprint"));
        assertFalse(documents.getValue().getFirst().getContent().contains("690000"));
        verify(tours, never()).findAll();
    }

    @Test void emptyCatalogStillClearsOldTourKnowledge() {
        when(tours.findByIsActiveTrue()).thenReturn(List.of());
        assertEquals(0, new DataIngestionService(vector, tours, new TourKnowledgeContent(itineraries, gears), jdbc).ingestTourDataToVectorStore());
        verify(jdbc).update(contains("category"), eq("TOUR_INFO"));
        verifyNoInteractions(vector);
    }

    @Test void vectorFailurePropagatesSoTransactionCanRollback() {
        when(tours.findByIsActiveTrue()).thenReturn(List.of(tour()));
        doThrow(new IllegalStateException("embedding unavailable")).when(vector).add(anyList());
        assertThrows(IllegalStateException.class, () -> new DataIngestionService(vector, tours, new TourKnowledgeContent(itineraries, gears), jdbc).ingestTourDataToVectorStore());
    }

    @Test void liveCatalogUsesCurrentPriceAndOnlyOpenSchedulesWithSeats() {
        Tour t = tour();
        when(tours.findByIsActiveTrueOrderByIdAsc(any())).thenReturn(List.of(t));
        List<TourSchedule> values = new ArrayList<>();
        for (String state : List.of("OPEN", "FULL", "CANCELLED", "CLOSED")) {
            TourSchedule s = new TourSchedule(); s.setId((long)values.size()+1); s.setTour(t);
            s.setDepartureDate(LocalDate.now().plusDays(20)); s.setReturnDate(s.getDepartureDate());
            s.setStatus(state); s.setAvailableSlots(5); values.add(s);
        }
        when(schedules.findByTourIdInAndDepartureDateAfterOrderByDepartureDateAsc(anyList(), any())).thenReturn(values);
        var ctx = new TourChatContext(tours, schedules, new ObjectMapper());
        var first = ctx.current(); assertEquals(Set.of("1"), first.tourIds());
        assertTrue(first.text().contains("690000")); assertTrue(first.text().contains("/tours/demo"));
        assertEquals(1, first.text().split("availableSlots", -1).length-1);
        t.setPricePerPax(BigDecimal.valueOf(790000)); values.getFirst().setAvailableSlots(0);
        String updated = ctx.current().text();
        assertTrue(updated.contains("790000")); assertFalse(updated.contains("690000"));
        assertTrue(updated.contains("\"schedules\":[]"));
    }
}
