package com.trekkingcamping.backend.module.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.chat.service.ChatAssistant;
import com.trekkingcamping.backend.module.chat.service.WeatherSafetyService;
import com.trekkingcamping.backend.module.tour.entity.AdventureProfile;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WeatherSafetyTest {

    private TourRepository tours = mock(TourRepository.class);
    private ObjectMapper objectMapper = new ObjectMapper();
    private WeatherSafetyService service;

    private Tour tourFansipan;

    @BeforeEach
    void setup() {
        service = new WeatherSafetyService(tours, objectMapper);

        tourFansipan = new Tour();
        tourFansipan.setId(1L);
        tourFansipan.setTitle("Fansipan 2N1Đ");
        tourFansipan.setSlug("fansipan-2n1d");
        tourFansipan.setLocation("Sa Pa, Lào Cai");
        tourFansipan.setIsActive(true);
        var prof = new AdventureProfile();
        prof.setMaxAltitudeM(3143);
        prof.setDistanceKm(BigDecimal.valueOf(28));
        tourFansipan.setAdventureProfile(prof);

        when(tours.findByIsActiveTrue()).thenReturn(List.of(tourFansipan));
    }

    @Test
    void evaluateWeatherSafety_fansipanInWinter_returnsValidCardWithSummitLapseRate() {
        var card = service.evaluateWeatherSafety("Fansipan", "tháng 12");
        assertNotNull(card);
        assertEquals("Fansipan 2N1Đ", card.tourTitle());
        assertTrue(card.maxAltitudeM() >= 3000);
        assertNotNull(card.safetyStatus());
        assertNotNull(card.safetyBadgeLabel());
        assertFalse(card.metrics().isEmpty());
        assertFalse(card.alerts().isEmpty());
        assertFalse(card.quickPills().isEmpty());

        // Summit temperature should be strictly lower than base temperature due to 6°C/1000m lapse rate
        assertTrue(card.summitTempDayC() < card.baseTempDayC());
        assertTrue(card.summitTempNightC() < card.baseTempNightC());

        // Quick pills should include packing checklist trigger
        assertTrue(card.quickPills().stream().anyMatch(p -> p.contains("🎒") || p.contains("đồ cần chuẩn bị")));
    }

    @Test
    void isWeatherQuestion_correctlyIdentifiesIntent() {
        assertTrue(ChatAssistant.isWeatherQuestion("Thời tiết Fansipan tháng 11 thế nào?"));
        assertTrue(ChatAssistant.isWeatherQuestion("Đi Lảo Thẩn có mưa không?"));
        assertTrue(ChatAssistant.isWeatherQuestion("Nhiệt độ trên đỉnh về đêm bao nhiêu?"));
        assertTrue(ChatAssistant.isWeatherQuestion("Leo Bạch Mộc mùa này có săn mây được không?"));
        assertTrue(ChatAssistant.isWeatherQuestion("Cung này người mới đi có an toàn không?"));
        assertFalse(ChatAssistant.isWeatherQuestion("Cho tôi xem danh sách tour giá rẻ"));
    }
}
