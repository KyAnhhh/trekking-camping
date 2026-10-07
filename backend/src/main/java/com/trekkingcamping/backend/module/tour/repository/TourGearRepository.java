package com.trekkingcamping.backend.module.tour.repository;

import com.trekkingcamping.backend.module.tour.entity.TourGear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TourGearRepository extends JpaRepository<TourGear, Long> {
    List<TourGear> findByTourId(Long tourId);
}