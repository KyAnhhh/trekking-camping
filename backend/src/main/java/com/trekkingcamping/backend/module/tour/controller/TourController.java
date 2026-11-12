package com.trekkingcamping.backend.module.tour.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.dto.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.service.SemanticTourSearchService;
import com.trekkingcamping.backend.module.tour.service.TourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tours")
public class TourController {

    private final TourService tourService;
    private final com.trekkingcamping.backend.module.guide.service.GuideService guides;
    private final SemanticTourSearchService semanticSearch;

    public TourController(TourService tourService, com.trekkingcamping.backend.module.guide.service.GuideService guides) {
        this(tourService, guides, null);
    }

    @Autowired
    public TourController(TourService tourService,
                          com.trekkingcamping.backend.module.guide.service.GuideService guides,
                          SemanticTourSearchService semanticSearch) {
        this.tourService = tourService;
        this.guides = guides;
        this.semanticSearch = semanticSearch;
    }

    @PostMapping
    public ApiResponse<Tour> createTour(@RequestBody CreateTourRequestDto request) {
        Tour createdTour = tourService.createTour(request);
        ApiResponse<Tour> response = new ApiResponse<>();
        response.setData(createdTour);
        return response;
    }

    @GetMapping
    public ApiResponse<List<Tour>> getAllTours(
            @RequestParam(required = false) Integer difficulty,
            @RequestParam(required = false) String search) {

        List<Tour> tours = tourService.filterTours(difficulty, search);

        ApiResponse<List<Tour>> response = new ApiResponse<>();
        response.setData(tours);

        return response;
    }

    @GetMapping("/semantic-search")
    public ApiResponse<List<SemanticTourResultDto>> semanticSearch(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false) Integer difficulty,
            @RequestParam(required = false) String duration) {
        List<SemanticTourResultDto> results = semanticSearch != null
                ? semanticSearch.search(q, difficulty, duration)
                : tourService.filterTours(difficulty, q).stream()
                        .map(t -> new SemanticTourResultDto(t, 1.0, "KEYWORD", List.of()))
                        .toList();
        ApiResponse<List<SemanticTourResultDto>> response = new ApiResponse<>();
        response.setData(results);
        return response;
    }

    @GetMapping("/{slug}")
    public ApiResponse<Tour> getTourBySlug(@PathVariable String slug) {
        Tour tour = tourService.getTourBySlug(slug);
        ApiResponse<Tour> response = new ApiResponse<>();
        response.setData(tour);
        return response;
    }

    // --- API ITINERARIES ---
    @PostMapping("/{tourId}/itineraries")
    public ApiResponse<TourItinerary> addItinerary(@PathVariable Long tourId, @RequestBody CreateItineraryRequestDto request) {
        TourItinerary itinerary = tourService.addItinerary(tourId, request);
        ApiResponse<TourItinerary> response = new ApiResponse<>();
        response.setData(itinerary);
        return response;
    }

    @GetMapping("/{tourId}/itineraries")
    public ApiResponse<List<TourItinerary>> getItineraries(@PathVariable Long tourId) {
        List<TourItinerary> itineraries = tourService.getItinerariesByTourId(tourId);
        ApiResponse<List<TourItinerary>> response = new ApiResponse<>();
        response.setData(itineraries);
        return response;
    }

    // --- API SCHEDULES ---
    @PostMapping("/{tourId}/schedules")
    public ApiResponse<TourSchedule> addSchedule(@PathVariable Long tourId, @RequestBody CreateScheduleRequestDto request) {
        TourSchedule schedule = tourService.addSchedule(tourId, request);
        ApiResponse<TourSchedule> response = new ApiResponse<>();
        response.setData(schedule);
        return response;
    }

    @GetMapping("/{tourId}/schedules")
    public ApiResponse<List<com.trekkingcamping.backend.module.guide.dto.GuideDtos.Schedule>> getSchedules(@PathVariable Long tourId) {
        ApiResponse<List<com.trekkingcamping.backend.module.guide.dto.GuideDtos.Schedule>> response = new ApiResponse<>();
        response.setData(guides.publicSchedules(tourId));
        return response;
    }

    // --- API GEARS ---
    @PostMapping("/{tourId}/gears")
    public ApiResponse<TourGear> addGear(@PathVariable Long tourId, @RequestBody CreateGearRequestDto request) {
        TourGear gear = tourService.addGear(tourId, request);
        ApiResponse<TourGear> response = new ApiResponse<>();
        response.setData(gear);
        return response;
    }

    @GetMapping("/{tourId}/gears")
    public ApiResponse<List<TourGear>> getGears(@PathVariable Long tourId) {
        List<TourGear> gears = tourService.getGearsByTourId(tourId);
        ApiResponse<List<TourGear>> response = new ApiResponse<>();
        response.setData(gears);
        return response;
    }
}
