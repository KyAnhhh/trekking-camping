package com.trekkingcamping.backend.module.user.service;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import java.util.List;

/** Include scalar user IDs too: Hibernate does not infer foreign keys for those columns. */
@Component
public class UserDependencies {
    static final List<String> QUERIES = List.of(
            "select 1 from Booking e where e.user.id = :id",
            "select 1 from Guide e where e.user.id = :id",
            "select 1 from TourReview e where e.user.id = :id",
            "select 1 from SavedPlan e where e.user.id = :id",
            "select 1 from ChatMessage e where e.user.id = :id",
            "select 1 from ChatSession e where e.userId = :id",
            "select 1 from ChatBookingDraft e where e.userId = :id",
            "select 1 from ParticipationAudit e where e.actorId = :id",
            "select 1 from Notification e where e.user.id = :id",
            "select 1 from GuideInvitation e where e.invitedBy = :id",
            "select 1 from PasswordResetToken e where e.user.id = :id");
    private final EntityManager em;
    public UserDependencies(EntityManager em) { this.em = em; }

    public boolean exists(Long id) {
        return QUERIES.stream().anyMatch(query -> !em.createQuery(query, Integer.class)
                .setParameter("id", id).setMaxResults(1).getResultList().isEmpty());
    }
}
