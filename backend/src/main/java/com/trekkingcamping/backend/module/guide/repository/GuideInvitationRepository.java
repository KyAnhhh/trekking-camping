package com.trekkingcamping.backend.module.guide.repository;
import com.trekkingcamping.backend.module.guide.entity.GuideInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface GuideInvitationRepository extends JpaRepository<GuideInvitation,Long> {
    Optional<GuideInvitation> findByTokenHash(String hash);
}
