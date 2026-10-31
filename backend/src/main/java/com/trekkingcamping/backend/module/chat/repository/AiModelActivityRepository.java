package com.trekkingcamping.backend.module.chat.repository;

import com.trekkingcamping.backend.module.chat.entity.AiModelActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AiModelActivityRepository extends JpaRepository<AiModelActivity, Long> {
    List<AiModelActivity> findTop50ByOrderByCreatedAtDesc();
    List<AiModelActivity> findTop30ByModelIdOrderByCreatedAtDesc(String modelId);
}
