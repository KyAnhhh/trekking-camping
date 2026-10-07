package com.trekkingcamping.backend.module.tour.repository;

import com.trekkingcamping.backend.module.tour.entity.TourImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TourImageRepository extends JpaRepository<TourImage, Long> {
    List<TourImage> findByTourIdOrderByIsCoverDescIdAsc(Long tourId);
    List<TourImage> findByTourIdInAndIsCoverTrue(List<Long> tourIds);
}
