package com.trekkingcamping.backend.module.user.service;

import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserDependenciesTest {
    @Test void referenceQueriesCompileAgainstRealMappingsWithoutDatabase() throws Exception {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.hbm2ddl.auto", "none").build();
        try {
            var sources = new MetadataSources(registry);
            for (String entity : List.of("user.User", "user.Role", "booking.Booking", "tour.TourSchedule", "tour.Tour",
                    "guide.Guide", "review.TourReview", "planner.SavedPlan", "chat.ChatMessage", "chat.ChatSession",
                    "chat.ChatBookingDraft", "booking.ParticipationAudit", "notification.Notification", "auth.PasswordResetToken", "guide.GuideInvitation")) {
                String[] parts = entity.split("\\.");
                sources.addAnnotatedClass(Class.forName("com.trekkingcamping.backend.module."+parts[0]+".entity."+parts[1]));
            }
            try (var factory = sources.buildMetadata().buildSessionFactory(); var session = factory.openSession()) {
                for (String query : UserDependencies.QUERIES)
                    assertDoesNotThrow(() -> session.createQuery(query, Integer.class), query);
                for (var method : UserRepository.class.getMethods()) {
                    Query query = method.getAnnotation(Query.class);
                    if (query != null) assertDoesNotThrow(() -> session.createQuery(query.value(), Object.class));
                }
            }
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }

    @Test @SuppressWarnings("unchecked") void everyKindOfRelatedRecordPreventsDeletion() {
        for (String blocking : UserDependencies.QUERIES) {
            var em = mock(EntityManager.class);
            for (String hql : UserDependencies.QUERIES) {
                TypedQuery<Integer> query = mock(TypedQuery.class);
                when(em.createQuery(hql, Integer.class)).thenReturn(query);
                when(query.setParameter("id", 42L)).thenReturn(query);
                when(query.setMaxResults(1)).thenReturn(query);
                when(query.getResultList()).thenReturn(hql.equals(blocking) ? List.of(1) : List.of());
            }
            assertTrue(new UserDependencies(em).exists(42L), blocking);
        }
    }
}
