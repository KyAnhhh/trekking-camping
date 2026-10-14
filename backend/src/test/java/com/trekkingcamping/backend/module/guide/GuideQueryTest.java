package com.trekkingcamping.backend.module.guide;
import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import static org.junit.jupiter.api.Assertions.*;

/** Validate mappings and HQL with Hibernate's real metamodel; no connection/schema changes. */
class GuideQueryTest {
    @Test void repositoryQueriesCompileAgainstRealEntityMappings() {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.hbm2ddl.auto", "none").build();
        try (var factory = new MetadataSources(registry).addAnnotatedClass(Guide.class).addAnnotatedClass(ScheduleGuide.class)
                .addAnnotatedClass(Tour.class).addAnnotatedClass(TourSchedule.class).buildMetadata().buildSessionFactory();
             var session = factory.openSession()) {
            for (var repo : new Class<?>[]{GuideRepository.class, ScheduleGuideRepository.class,
                    com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository.class}) {
                for (var method : repo.getMethods()) {
                    Query query = method.getAnnotation(Query.class);
                    if (query != null) assertDoesNotThrow(() -> session.createQuery(query.value(), Object.class), method.getName());
                }
            }
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }
}
