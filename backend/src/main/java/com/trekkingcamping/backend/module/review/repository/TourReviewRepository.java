package com.trekkingcamping.backend.module.review.repository;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.*;
public interface TourReviewRepository extends JpaRepository<TourReview, Long>, JpaSpecificationExecutor<TourReview> {
    @EntityGraph(attributePaths={"tour", "user", "booking"})
    org.springframework.data.domain.Page<TourReview> findAll(org.springframework.data.jpa.domain.Specification<TourReview> spec, Pageable pageable);
    long countByIsApprovedTrue();
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from TourReview r where r.id = :id")
    Optional<TourReview> locked(@Param("id") Long id);
    Optional<TourReview> findByBookingId(Long bookingId);
    List<TourReview> findByTourIdAndIsApprovedTrueOrderByCreatedAtDesc(Long tourId, Pageable page);
    long countByTourIdAndIsApprovedTrue(Long tourId);
    @Query("select avg(r.rating) from TourReview r where r.tour.id = :tourId and r.isApproved = true")
    Double average(@Param("tourId") Long tourId);
}
