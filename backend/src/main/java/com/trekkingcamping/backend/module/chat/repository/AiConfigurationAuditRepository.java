package com.trekkingcamping.backend.module.chat.repository;
import com.trekkingcamping.backend.module.chat.entity.AiConfigurationAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AiConfigurationAuditRepository extends JpaRepository<AiConfigurationAudit,Long> {
    List<AiConfigurationAudit> findTop20ByOrderByRevisionDesc();
}
