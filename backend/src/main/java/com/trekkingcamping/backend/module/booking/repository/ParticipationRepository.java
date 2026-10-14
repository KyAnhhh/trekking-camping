package com.trekkingcamping.backend.module.booking.repository;
import com.trekkingcamping.backend.module.booking.entity.ParticipationDeclaration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface ParticipationRepository extends JpaRepository<ParticipationDeclaration,Long> {
    List<ParticipationDeclaration> findTop100ByPurgeAfterBefore(Instant now);
}
