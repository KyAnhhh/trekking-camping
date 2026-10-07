package com.trekkingcamping.backend.module.tour;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TourImportTest {
    TourRepository repository = mock(TourRepository.class);
    TourService tours = mock(TourService.class);
    TourImportService importer = new TourImportService(new ObjectMapper().findAndRegisterModules(), repository, tours);
    String tour = "{\"title\":\"Tour test\",\"slug\":\"tour-test\",\"location\":\"Lam Dong\",\"durationDays\":2,\"durationNights\":1,\"difficultyLevel\":2,\"pricePerPax\":2500000,\"maxCapacity\":12}";
    MockMultipartFile file(String content) { return new MockMultipartFile("file", "tours.json", "application/json", content.getBytes(StandardCharsets.UTF_8)); }
    @Test void importsTourAndChildrenIntoBusinessRepositories() throws Exception {
        Tour saved = new Tour(); saved.setId(1L); saved.setSlug("tour-test"); saved.setTitle("Tour test");
        when(tours.createTour(any())).thenReturn(saved);
        var result = importer.importFile(file("[{\"tour\":" + tour + ",\"itineraries\":[{\"dayNumber\":1,\"title\":\"Ngay 1\"}],\"gears\":[{\"gearName\":\"Leu\",\"isProvided\":true,\"rentalPrice\":0}]}]"));
        assertEquals(1, result.count()); verify(tours).addItinerary(eq(1L), any()); verify(tours).addGear(eq(1L), any());
    }
    @Test void invalidLastEntryPreventsAllWrites() {
        String invalid = tour.replace("\"maxCapacity\":12", "\"maxCapacity\":0").replace("tour-test", "tour-second");
        var error = assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("[{\"tour\":" + tour + "},{\"tour\":" + invalid + "}]")));
        assertTrue(error.getMessage().contains("thứ 2")); verifyNoInteractions(tours);
    }
    @Test void rejectsExistingAndDuplicateSlugs() {
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("[{\"tour\":" + tour + "},{\"tour\":" + tour + "}]")));
        when(repository.existsBySlug("tour-test")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("[{\"tour\":" + tour + "}]"))); verifyNoInteractions(tours);
    }
    @Test void rejectsMassAssignmentMalformedJsonAndFractionalIntegers() {
        for (String bad : new String[]{"not json", "[]", "null", "[{\"tour\":" + tour.replace("\"title\":", "\"id\":123,\"title\":") + "}]",
                "[{\"tour\":" + tour.replace("\"durationDays\":2", "\"durationDays\":1.5") + "}]"}) {
            assertThrows(IllegalArgumentException.class, () -> importer.importFile(file(bad)));
        }
        verifyNoInteractions(tours);
    }
    @Test void rejectsPastScheduleAndOutOfRangeItinerary() {
        for (String child : new String[]{"\"schedules\":[{\"departureDate\":\"2000-01-01\",\"returnDate\":\"2000-01-02\"}]", "\"itineraries\":[{\"dayNumber\":5,\"title\":\"Wrong\"}]"}) {
            assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("[{\"tour\":" + tour + "," + child + "}]")));
        }
        verifyNoInteractions(tours);
    }
    @Test void importsGuideAssignmentsByStableCode() throws Exception {
        Tour saved = new Tour(); saved.setId(1L); saved.setSlug("tour-test"); saved.setTitle("Tour test");
        when(tours.createTour(any())).thenReturn(saved);
        String start = java.time.LocalDate.now().plusDays(30).toString();
        String schedule = "{\"departureDate\":\"" + start + "\",\"returnDate\":\"" + start + "\",\"availableSlots\":10,\"guideAssignments\":[{\"guideCode\":\"HDV_01\",\"role\":\"LEAD\"}]}";
        importer.importFile(file("[{\"tour\":" + tour + ",\"schedules\":[" + schedule + "]}]"));
        verify(tours).addSchedule(eq(1L), argThat(r -> r.getGuideAssignments().size() == 1 && r.getGuideAssignments().getFirst().guideCode().equals("HDV_01")));
    }
    @Test void invalidGuideRolePreventsWholeBatchWrites() {
        String start = java.time.LocalDate.now().plusDays(30).toString();
        String schedule = "{\"departureDate\":\"" + start + "\",\"returnDate\":\"" + start + "\",\"availableSlots\":10,\"guideAssignments\":[{\"guideCode\":\"HDV_01\",\"role\":\"ADMIN\"}]}";
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("[{\"tour\":" + tour + ",\"schedules\":[" + schedule + "]}]")));
        verifyNoInteractions(tours);
    }
    @Test void rejectsOversizedOrWrongFileExtension() {
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(new MockMultipartFile("file", "data.txt", "text/plain", "[]".getBytes())));
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(new MockMultipartFile("file", "data.json", "application/json", new byte[1024 * 1024 + 1])));
    }
}
