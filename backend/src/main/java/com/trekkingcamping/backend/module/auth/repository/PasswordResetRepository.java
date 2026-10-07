package com.trekkingcamping.backend.module.auth.repository;

import com.trekkingcamping.backend.module.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface PasswordResetRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String hash);
    Optional<PasswordResetToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndCreatedAtAfter(Long userId, java.time.Instant since);
    @Modifying(flushAutomatically = true)
    @Query("update PasswordResetToken t set t.used = true where t.user.id = :userId")
    void invalidateAll(@Param("userId") Long userId);
}
