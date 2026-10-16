package com.trekkingcamping.backend.module.guide.repository;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface GuideRepository extends JpaRepository<Guide, Long> {
    Optional<Guide> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    List<Guide> findAllByOrderByFullNameAsc();
    Optional<Guide> findByCode(String code);
    boolean existsByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Guide g where g.id = :id")
    Optional<Guide> lockById(@Param("id") Long id);
}

