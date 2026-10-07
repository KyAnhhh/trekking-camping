
package com.trekkingcamping.backend.module.tour.repository;

import java.util.List;
import java.util.Optional;

import com.trekkingcamping.backend.module.tour.entity.Tour;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TourRepository extends JpaRepository<Tour, Long> {

    Optional<Tour> findBySlug(String slug);

    boolean existsBySlug(String slug);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tour t where t.id = :id")
    Optional<Tour> findByIdForUpdate(@Param("id") Long id);

    // Lấy tất cả tour đang hoạt động
    List<Tour> findByIsActiveTrue();
    List<Tour> findByIsActiveTrueOrderByIdAsc(org.springframework.data.domain.Pageable pageable);

    // Lọc theo độ khó
    List<Tour> findByIsActiveTrueAndDifficultyLevel(Integer difficulty);

    // Tìm kiếm theo tên hoặc địa điểm
    @Query("""
        SELECT t FROM Tour t
        WHERE t.isActive = true
        AND (
            LOWER(t.title) LIKE :search
            OR LOWER(t.location) LIKE :search
        )
        """)
    List<Tour> searchActiveTours(
        @Param("search") String search
    );

    // Lọc đồng thời theo độ khó và từ khóa
    @Query("""
        SELECT t FROM Tour t
        WHERE t.isActive = true
        AND t.difficultyLevel = :difficulty
        AND (
            LOWER(t.title) LIKE :search
            OR LOWER(t.location) LIKE :search
        )
        """)
    List<Tour> searchActiveToursByDifficulty(
        @Param("difficulty") Integer difficulty,
        @Param("search") String search
    );
}
