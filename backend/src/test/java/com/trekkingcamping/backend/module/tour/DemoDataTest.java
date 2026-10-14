package com.trekkingcamping.backend.module.tour;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.tour.service.*;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DemoDataTest {
    @Test void preparedFilesMatchActualImporterAndGuideScheduleContracts() throws Exception {
        Path dir = Path.of(getClass().getResource("/fixtures").toURI());
        ObjectMapper json = new ObjectMapper().findAndRegisterModules();
        var profiles = json.readValue(Files.readAllBytes(dir.resolve("guides.json")), com.trekkingcamping.backend.module.guide.dto.GuideDtos.Edit[].class);
        Set<String> codes = new HashSet<>();
        for (var p : profiles) { assertTrue(codes.add(p.code())); assertTrue(p.active()); }
        var source = json.readTree(Files.readAllBytes(dir.resolve("tours-with-guides.json")));
        Map<String,List<LocalDate[]>> assignments = new HashMap<>();
        TourService tours = mock(TourService.class);
        when(tours.createTour(any())).thenAnswer(inv -> { var t = new Tour(); t.setId(1L); t.setSlug("fixture"); t.setTitle("fixture"); return t; });
        // Shift fixture dates as one block for a test that remains valid after the demo expires.
        LocalDate original = LocalDate.parse(source.get(0).get("schedules").get(0).get("departureDate").asText());
        long shift = java.time.temporal.ChronoUnit.DAYS.between(original, LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(14));
        for (var entry : source) {
            int duration = entry.get("tour").get("durationDays").asInt();
            assertEquals(duration, entry.get("itineraries").size());
            for (var schedule : entry.get("schedules")) {
                LocalDate start = LocalDate.parse(schedule.get("departureDate").asText()).plusDays(shift);
                LocalDate end = LocalDate.parse(schedule.get("returnDate").asText()).plusDays(shift);
                assertEquals(duration-1, java.time.temporal.ChronoUnit.DAYS.between(start,end));
                ((com.fasterxml.jackson.databind.node.ObjectNode)schedule).put("departureDate",start.toString()).put("returnDate",end.toString());
                for (var a : schedule.get("guideAssignments")) {
                    String code = a.get("guideCode").asText(); assertTrue(codes.contains(code));
                    var windows = assignments.computeIfAbsent(code, k -> new ArrayList<>());
                    assertTrue(windows.stream().noneMatch(w -> !end.isBefore(w[0]) && !start.isAfter(w[1])));
                    windows.add(new LocalDate[]{start,end});
                }
            }
        }
        var importer = new TourImportService(json, mock(TourRepository.class), tours);
        assertEquals(3, importer.importFile(new MockMultipartFile("file", "demo.json", "application/json", json.writeValueAsBytes(source))).count());
        verify(tours, times(6)).addSchedule(anyLong(), any());
        verify(tours, times(6)).addItinerary(anyLong(), any());
    }
}
