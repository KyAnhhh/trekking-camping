package com.trekkingcamping.backend.module.chat;

import com.trekkingcamping.backend.module.chat.service.TourComparisonService;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TourComparisonTest {

    private TourRepository tours = mock(TourRepository.class);
    private TourScheduleRepository schedules = mock(TourScheduleRepository.class);
    private TourItineraryRepository itineraries = mock(TourItineraryRepository.class);
    private TourComparisonService service;

    private Tour tourFansipan;
    private Tour tourTaNang;

    @BeforeEach
    void setup() {
        service = new TourComparisonService(tours, schedules, itineraries);

        tourFansipan = new Tour();
        tourFansipan.setId(1L);
        tourFansipan.setTitle("Fansipan 2N1Đ");
        tourFansipan.setSlug("fansipan-2n1d");
        tourFansipan.setLocation("Sa Pa, Lào Cai");
        tourFansipan.setDifficultyLevel(2);
        tourFansipan.setDurationDays(2);
        tourFansipan.setPricePerPax(BigDecimal.valueOf(2850000));
        tourFansipan.setIsActive(true);
        var prof1 = new AdventureProfile();
        prof1.setMaxAltitudeM(3143);
        prof1.setDistanceKm(BigDecimal.valueOf(24));
        tourFansipan.setAdventureProfile(prof1);

        tourTaNang = new Tour();
        tourTaNang.setId(2L);
        tourTaNang.setTitle("Tà Năng - Phan Dũng 3N2Đ");
        tourTaNang.setSlug("ta-nang-phan-dung");
        tourTaNang.setLocation("Lâm Đồng - Bình Thuận");
        tourTaNang.setDifficultyLevel(3);
        tourTaNang.setDurationDays(3);
        tourTaNang.setPricePerPax(BigDecimal.valueOf(3100000));
        tourTaNang.setIsActive(true);
        var prof2 = new AdventureProfile();
        prof2.setMaxAltitudeM(1100);
        prof2.setDistanceKm(BigDecimal.valueOf(35));
        tourTaNang.setAdventureProfile(prof2);

        when(tours.findByIsActiveTrue()).thenReturn(List.of(tourFansipan, tourTaNang));
    }

    @Test
    void compareToursReturnsBothToursAndVerdict() {
        var card = service.compareTours("Fansipan", "Tà Năng");
        assertNotNull(card);
        assertEquals("Fansipan 2N1Đ", card.tourA().title());
        assertEquals("Tà Năng - Phan Dũng 3N2Đ", card.tourB().title());
        assertEquals(3143, card.tourA().maxAltitudeM());
        assertEquals(1100, card.tourB().maxAltitudeM());
        assertTrue(card.verdict().contains("Fansipan 2N1Đ"));
        assertFalse(card.quickPills().isEmpty());
    }

    @Test
    void getTourTimelineReturnsMilestones() {
        var it1 = new TourItinerary();
        it1.setId(10L);
        it1.setDayNumber(1);
        it1.setTitle("Ngày 1: Xuất phát");
        it1.setDescription("Khởi hành từ bìa rừng, leo dốc qua rừng trúc.");

        when(itineraries.findByTourIdOrderByDayNumberAsc(1L)).thenReturn(List.of(it1));

        var timeline = service.getTourTimeline("Fansipan");
        assertNotNull(timeline);
        assertEquals(1L, timeline.tourId());
        assertFalse(timeline.days().isEmpty());
        assertEquals(1, timeline.days().get(0).dayNumber());
        assertFalse(timeline.days().get(0).milestones().isEmpty());
        assertFalse(timeline.quickPills().isEmpty());
    }
}
