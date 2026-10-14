package com.trekkingcamping.backend.module.tour;
import com.trekkingcamping.backend.module.tour.entity.AdventureProfile;
import com.trekkingcamping.backend.module.tour.dto.CreateTourRequestDto;
import com.trekkingcamping.backend.module.tour.service.TourValidation;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
class AdventureProfileTest {
    @Test void overnightPickupRequiresTimeAndPlaceAndMatchesDeparture() {
        LocalDate departure=LocalDate.now().plusDays(10);
        assertDoesNotThrow(()->TourValidation.pickup(departure.minusDays(1).atTime(22,30),"Test pickup",departure));
        assertThrows(IllegalArgumentException.class,()->TourValidation.pickup(departure.atStartOfDay(),"",departure));
        assertThrows(IllegalArgumentException.class,()->TourValidation.pickup(departure.plusDays(1).atStartOfDay(),"Test",departure));
    }
    @Test void databaseDecimalScaleDoesNotTurnUnchangedProfileIntoMaterialEdit() {
        var a=new AdventureProfile();a.setDistanceKm(new BigDecimal("10.00"));
        var b=new AdventureProfile();b.setDistanceKm(BigDecimal.TEN);assertTrue(a.sameAs(b));
        b.setDistanceKm(new BigDecimal("11"));assertFalse(a.sameAs(b));
    }
    @Test void missingMetricsStayUnknownAndOldImportsRemainReadable() throws Exception {
        var dto=new ObjectMapper().readValue("{\"title\":\"test\"}",CreateTourRequestDto.class);
        assertNull(dto.getAdventureProfile());assertDoesNotThrow(()->TourValidation.adventure(null));
        assertDoesNotThrow(()->TourValidation.adventure(new AdventureProfile()));
    }
    @Test void metricsRequireSourceAndMedicalEstimateNeedsContext() {
        var p=new AdventureProfile();p.setDistanceKm(BigDecimal.TEN);
        assertThrows(IllegalArgumentException.class,()->TourValidation.adventure(p));
        p.setSourceNote("Synthetic test");p.setVerifiedOn(LocalDate.now().minusDays(1));TourValidation.adventure(p);
        p.setMedicalAccessHours(BigDecimal.ONE);assertThrows(IllegalArgumentException.class,()->TourValidation.adventure(p));
        p.setMedicalAccessNotes("Test assumption only");TourValidation.adventure(p);
    }
    @Test void rejectsInvalidUnitsRangesAndMonths() {
        var p=new AdventureProfile();p.setSourceNote("test");p.setVerifiedOn(LocalDate.now().minusDays(1));
        p.setActiveHoursPerDay(BigDecimal.valueOf(25));assertThrows(IllegalArgumentException.class,()->TourValidation.adventure(p));
        p.setActiveHoursPerDay(BigDecimal.valueOf(6));p.setRecommendedMonths("13");assertThrows(IllegalArgumentException.class,()->TourValidation.adventure(p));
        p.setRecommendedMonths("3,4,5");p.setMaxAltitudeM(-1);assertThrows(IllegalArgumentException.class,()->TourValidation.adventure(p));
    }
}
