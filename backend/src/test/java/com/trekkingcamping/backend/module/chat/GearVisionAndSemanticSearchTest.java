package com.trekkingcamping.backend.module.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.common.exception.GlobalExceptionHandler;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.chat.controller.GearVisionController;
import com.trekkingcamping.backend.module.chat.dto.GearCheckResultDto;
import com.trekkingcamping.backend.module.chat.service.ChatRateLimit;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import com.trekkingcamping.backend.module.chat.service.DataIngestionService;
import com.trekkingcamping.backend.module.chat.service.GearVisionService;
import com.trekkingcamping.backend.module.tour.dto.SemanticTourResultDto;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.tour.repository.TourItineraryRepository;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.service.SemanticTourSearchService;
import com.trekkingcamping.backend.module.tour.service.TourService;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GearVisionAndSemanticSearchTest {

    @Test
    void gearVisionSanitizesImageAndParsesStructuredJson() throws Exception {
        ChatService chatService = mock(ChatService.class);
        TourRepository tourRepo = mock(TourRepository.class);
        TourGearRepository gearRepo = mock(TourGearRepository.class);
        BookingRepository bookingRepo = mock(BookingRepository.class);
        UserRepository userRepo = mock(UserRepository.class);

        Tour tour = new Tour();
        tour.setId(1L);
        tour.setTitle("Tà Năng - Phan Dũng");
        tour.setLocation("Lâm Đồng");
        tour.setDurationDays(3);
        tour.setDurationNights(2);
        tour.setDifficultyLevel(2);
        tour.setRequiredGear("Giày trekking cổ cao; Áo mưa bộ");
        tour.setIsActive(true);
        when(tourRepo.findById(1L)).thenReturn(java.util.Optional.of(tour));
        when(gearRepo.findByTourId(1L)).thenReturn(List.of());
        when(chatService.generateMultimodalJsonReply(anyString(), eq("image/jpeg"), anyString(), isNull()))
                .thenReturn("""
                        ```json
                        {
                          "verdict": "NEEDS_IMPROVEMENT",
                          "readinessScore": 72,
                          "summary": "Giày và balo cơ bản ổn, nhưng còn thiếu áo mưa bộ.",
                          "detectedItems": [
                            { "name": "Balo 30L", "status": "OK", "note": "Dung tích phù hợp 3 ngày" },
                            { "name": "Giày thể thao", "status": "WARNING", "note": "Đế hơi nông cho dốc đất đỏ" }
                          ],
                          "missingItems": ["Áo mưa bộ", "Đèn pin đội đầu"],
                          "safetyAdvice": ["Mang thêm 2L nước mỗi ngày"]
                        }
                        ```
                        """);

        GearVisionService service = new GearVisionService(
                chatService, tourRepo, gearRepo, bookingRepo, userRepo, new ObjectMapper());

        BufferedImage img = new BufferedImage(1600, 1200, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setColor(Color.GREEN);
        g.fillRect(0, 0, 1600, 1200);
        g.dispose();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);

        MockMultipartFile file = new MockMultipartFile("file", "gear.png", "image/png", baos.toByteArray());
        GearCheckResultDto res = service.inspectGear(file, 1L, null, "Check balo", "vi", null);

        assertEquals("Tà Năng - Phan Dũng", res.tourTitle());
        assertEquals("NEEDS_IMPROVEMENT", res.verdict());
        assertEquals(72, res.readinessScore());
        assertEquals(2, res.detectedItems().size());
        assertEquals("WARNING", res.detectedItems().get(1).status());
        assertEquals(List.of("Áo mưa bộ", "Đèn pin đội đầu"), res.missingItems());
    }

    @Test
    void gearVisionRejectsInvalidImageBytes() {
        GearVisionService service = new GearVisionService(
                mock(ChatService.class), mock(TourRepository.class), mock(TourGearRepository.class),
                mock(BookingRepository.class), mock(UserRepository.class), new ObjectMapper());

        MockMultipartFile badFile = new MockMultipartFile("file", "script.png", "image/png", "not-an-image".getBytes());
        assertThrows(IllegalArgumentException.class,
                () -> service.inspectGear(badFile, null, null, null, "vi", null));
    }

    @Test
    void gearVisionControllerContractReturnsEnvelope() throws Exception {
        GearVisionService visionService = mock(GearVisionService.class);
        when(visionService.inspectGear(any(), eq(2L), isNull(), any(), eq("vi"), any()))
                .thenReturn(new GearCheckResultDto(
                        "Đỉnh Lạc Dương",
                        "READY",
                        92,
                        "Hành trang rất đầy đủ.",
                        List.of(new GearCheckResultDto.DetectedItem("Giày trekking", "OK", "Độ bám tốt")),
                        List.of(),
                        List.of("Giữ ấm ban đêm")
                ));

        MockMvc mvc = MockMvcBuilders.standaloneSetup(new GearVisionController(visionService, new ChatRateLimit()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        MockMultipartFile file = new MockMultipartFile("file", "pack.jpg", "image/jpeg", new byte[]{1, 2, 3});
        mvc.perform(multipart("/api/ai/gear-check")
                        .file(file)
                        .param("tourId", "2")
                        .param("language", "vi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1000))
                .andExpect(jsonPath("$.data.verdict").value("READY"))
                .andExpect(jsonPath("$.data.readinessScore").value(92));
    }

    @Test
    void semanticSearchCombinesVectorAndIntentAndAppliesFilters() {
        TourRepository tourRepo = mock(TourRepository.class);
        TourService tourService = mock(TourService.class);
        TourItineraryRepository itineraryRepo = mock(TourItineraryRepository.class);
        TourGearRepository gearRepo = mock(TourGearRepository.class);
        VectorStore vectorStore = mock(VectorStore.class);
        DataIngestionService ingestion = mock(DataIngestionService.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);

        Tour cloudEasy = new Tour();
        cloudEasy.setId(10L);
        cloudEasy.setTitle("Cắm Trại Săn Mây Đỉnh Lạc Dương");
        cloudEasy.setSlug("cam-trai-san-may-lac-duong");
        cloudEasy.setLocation("Lâm Đồng");
        cloudEasy.setDurationDays(2);
        cloudEasy.setDurationNights(1);
        cloudEasy.setDifficultyLevel(1);
        cloudEasy.setPricePerPax(new BigDecimal("1850000"));
        cloudEasy.setSummary("Trải nghiệm cắm trại nhẹ nhàng ngắm biển mây bình minh cuối tuần.");
        cloudEasy.setIsActive(true);

        Tour hardPeak = new Tour();
        hardPeak.setId(20L);
        hardPeak.setTitle("Chinh Phục Đỉnh Fansipan");
        hardPeak.setSlug("fansipan");
        hardPeak.setLocation("Lào Cai");
        hardPeak.setDurationDays(3);
        hardPeak.setDurationNights(2);
        hardPeak.setDifficultyLevel(3);
        hardPeak.setPricePerPax(new BigDecimal("4200000"));
        hardPeak.setSummary("Leo núi mạo hiểm độ cao 3143m.");
        hardPeak.setIsActive(true);

        when(tourRepo.findByIsActiveTrue()).thenReturn(List.of(cloudEasy, hardPeak));
        when(tourService.withCovers(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(itineraryRepo.findByTourIdOrderByDayNumberAsc(anyLong())).thenReturn(List.of());
        when(gearRepo.findByTourId(anyLong())).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Long.class))).thenReturn(2L);
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                new Document("Săn mây nhẹ nhàng", Map.of("category", "TOUR_INFO", "tour_id", 10L, "distance", 0.22))
        ));

        SemanticTourSearchService searchService = new SemanticTourSearchService(
                tourRepo, tourService, itineraryRepo, gearRepo, vectorStore, ingestion, jdbc);

        List<SemanticTourResultDto> results = searchService.search("san may nhe nhang cuoi tuan cho nguoi moi", null, "short");
        assertEquals(1, results.size());
        assertEquals(10L, results.get(0).tour().getId());
        assertTrue(results.get(0).relevanceScore() > 0.5);
        assertEquals("HYBRID", results.get(0).matchType());
        assertFalse(results.get(0).matchedReasons().isEmpty());
    }
}
