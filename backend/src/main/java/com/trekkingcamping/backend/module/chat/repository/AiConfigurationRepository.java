package com.trekkingcamping.backend.module.chat.repository;
import com.trekkingcamping.backend.module.chat.entity.AiConfiguration;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface AiConfigurationRepository extends JpaRepository<AiConfiguration,Integer> {
    // PostgreSQL upsert serializes concurrent first saves without replacing existing settings.
    @Modifying
    @Query(value="INSERT INTO ai_configuration(id, revision, document) VALUES (1, 0, '{}') ON CONFLICT (id) DO NOTHING", nativeQuery=true)
    int insertDefaultIfMissing();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from AiConfiguration c where c.id=1")
    Optional<AiConfiguration> locked();
}
