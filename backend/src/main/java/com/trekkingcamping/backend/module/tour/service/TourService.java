package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.tour.dto.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;

import org.springframework.stereotype.Service;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Service
public class TourService {

    private final TourRepository tourRepository;
    private final TourItineraryRepository itineraryRepository;
    private final TourScheduleRepository scheduleRepository;
    private final TourGearRepository gearRepository;
    private final TourImageRepository imageRepository;
    private final com.trekkingcamping.backend.module.guide.service.GuideService guides;

    public TourService(TourRepository tourRepository,
                       TourItineraryRepository itineraryRepository,
                       TourScheduleRepository scheduleRepository,
                       TourGearRepository gearRepository, TourImageRepository imageRepository,
                       com.trekkingcamping.backend.module.guide.service.GuideService guides) {
        this.tourRepository = tourRepository;
        this.itineraryRepository = itineraryRepository;
        this.scheduleRepository = scheduleRepository;
        this.gearRepository = gearRepository;
        this.imageRepository = imageRepository;
        this.guides = guides;
    }

    public Tour createTour(CreateTourRequestDto request) {
        TourValidation.tour(request);
        if (tourRepository.existsBySlug(request.getSlug())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Slug tour này đã tồn tại!");
        }

        Tour tour = new Tour();
        tour.setTitle(request.getTitle());
        tour.setSlug(request.getSlug());
        tour.setLocation(request.getLocation());
        tour.setDurationDays(request.getDurationDays());
        tour.setDurationNights(request.getDurationNights());
        tour.setDifficultyLevel(request.getDifficultyLevel());
        tour.setPricePerPax(request.getPricePerPax());
        tour.setMaxCapacity(request.getMaxCapacity());
        tour.setSummary(request.getSummary());
        tour.setDescription(request.getDescription());
        tour.setSafetyTips(request.getSafetyTips());
        tour.setInsuranceInfo(request.getInsuranceInfo());
        tour.setEmergencyHotline(request.getEmergencyHotline());
        tour.setRequiredGear(request.getRequiredGear());
        tour.setAdventureProfile(request.getAdventureProfile());

        return tourRepository.save(tour);
    }

    @Transactional(readOnly = true)
    public List<Tour> getAllTours() {
        return withCovers(tourRepository.findByIsActiveTrue());
    }

    
    @Transactional(readOnly = true)
    public List<Tour> filterTours(Integer difficulty, String search) {

        boolean hasSearch = search != null && !search.isBlank();

        String searchPattern = hasSearch
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : "%";

        // Không truyền difficulty và search
        if (difficulty == null && !hasSearch) {
            return withCovers(tourRepository.findByIsActiveTrue());
        }

        // Chỉ lọc theo độ khó
        if (difficulty != null && !hasSearch) {
            return withCovers(tourRepository.findByIsActiveTrueAndDifficultyLevel(difficulty));
        }

        // Chỉ tìm kiếm theo từ khóa
        if (difficulty == null) {
            return withCovers(tourRepository.searchActiveTours(searchPattern));
        }

        // Lọc đồng thời độ khó và từ khóa
        return withCovers(tourRepository.searchActiveToursByDifficulty(
                difficulty,
                searchPattern
        ));
    }


    @Transactional(readOnly = true)
    public Tour getTourBySlug(String slug) {
        Tour tour = tourRepository.findBySlug(slug)
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy Tour!"));
        return withCovers(List.of(tour)).getFirst();
    }

    private List<Tour> withCovers(List<Tour> tours) {
        if (tours.isEmpty()) return tours;
        var covers = imageRepository.findByTourIdInAndIsCoverTrue(tours.stream().map(Tour::getId).toList());
        var urls = new java.util.HashMap<Long, String>();
        covers.forEach(i -> urls.putIfAbsent(i.getTour().getId(), i.getImageUrl()));
        tours.forEach(t -> t.setBannerUrl(urls.get(t.getId())));
        return tours;
    }

    // --- XỬ LÝ ITINERARY (LỊCH TRÌNH CÁC NGÀY) ---
    public TourItinerary addItinerary(Long tourId, CreateItineraryRequestDto request) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Tour với ID: " + tourId));

        TourItinerary itinerary = new TourItinerary();
        TourValidation.itinerary(request, tour.getDurationDays());
        itinerary.setTour(tour);
        itinerary.setDayNumber(request.getDayNumber());
        itinerary.setTitle(request.getTitle());
        itinerary.setDescription(request.getDescription());

        return itineraryRepository.save(itinerary);
    }

    public List<TourItinerary> getItinerariesByTourId(Long tourId) {
        return itineraryRepository.findByTourIdOrderByDayNumberAsc(tourId);
    }

    // --- XỬ LÝ SCHEDULE (LỊCH KHỞI HÀNH) ---
    @Transactional
    public TourSchedule addSchedule(Long tourId, CreateScheduleRequestDto request) {
        Tour tour = tourRepository.findByIdForUpdate(tourId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Tour với ID: " + tourId));

        TourSchedule schedule = new TourSchedule();
        TourValidation.schedule(request, tour.getMaxCapacity());
        if (java.time.temporal.ChronoUnit.DAYS.between(request.getDepartureDate(), request.getReturnDate()) != tour.getDurationDays() - 1)
            throw new IllegalArgumentException("Ngày về phải khớp thời lượng tour.");
        schedule.setTour(tour);
        schedule.setDepartureDate(request.getDepartureDate());
        schedule.setReturnDate(request.getReturnDate());
        schedule.setPickupAt(request.getPickupAt()); schedule.setPickupPoint(request.getPickupPoint());
        schedule.setAvailableSlots(request.getAvailableSlots() != null ? request.getAvailableSlots() : tour.getMaxCapacity());
        schedule.setGuideName(request.getGuideName());
        schedule.setGuidePhone(request.getGuidePhone());
        schedule.setStatus("OPEN");

        schedule = scheduleRepository.saveAndFlush(schedule);
        if (request.getGuideAssignments() != null) guides.assign(schedule.getId(), request.getGuideAssignments());
        return schedule;
    }

    public List<TourSchedule> getSchedulesByTourId(Long tourId) {
        return scheduleRepository.findByTourId(tourId);
    }

    // --- XỬ LÝ GEAR (THIẾT BỊ ĐI KÈM) ---
    public TourGear addGear(Long tourId, CreateGearRequestDto request) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Tour với ID: " + tourId));

        TourGear gear = new TourGear();
        TourValidation.gear(request);
        gear.setTour(tour);
        gear.setGearName(request.getGearName());
        gear.setIsProvided(request.getIsProvided());
        gear.setRentalPrice(request.getRentalPrice());

        return gearRepository.save(gear);
    }

    public List<TourGear> getGearsByTourId(Long tourId) {
        return gearRepository.findByTourId(tourId);
    }
}
