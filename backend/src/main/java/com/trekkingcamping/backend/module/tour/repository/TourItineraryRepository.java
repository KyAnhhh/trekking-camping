package com.trekkingcamping.backend.module.tour.repository;

import com.trekkingcamping.backend.module.tour.entity.TourItinerary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TourItineraryRepository extends JpaRepository<TourItinerary, Long> {
    List<TourItinerary> findByTourIdOrderByDayNumberAsc(Long tourId);
}