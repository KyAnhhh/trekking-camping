package com.trekkingcamping.backend.module.planner.repository;
import com.trekkingcamping.backend.module.planner.entity.SavedPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SavedPlanRepository extends JpaRepository<SavedPlan, Long> {
    List<SavedPlan> findByUserEmailOrderByCreatedAtDesc(String email);
    Optional<SavedPlan> findByIdAndUserEmail(Long id, String email);
    long countByUserId(Long userId);
    boolean existsByUserIdAndCreatedAtAfter(Long userId, java.time.Instant since);
}
