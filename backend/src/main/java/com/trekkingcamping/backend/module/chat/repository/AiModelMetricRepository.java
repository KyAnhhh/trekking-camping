package com.trekkingcamping.backend.module.chat.repository;

import com.trekkingcamping.backend.module.chat.entity.AiModelMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiModelMetricRepository extends JpaRepository<AiModelMetric, String> {
}
