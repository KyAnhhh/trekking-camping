package com.trekkingcamping.backend.module.planner.service;
import com.trekkingcamping.backend.module.planner.entity.SavedPlan;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PlanModelTest {
    @Test void newEntitiesAndReviewAggregationCompileWithoutDatabaseConnection() {
        var registry=new StandardServiceRegistryBuilder().applySetting("hibernate.dialect","org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access",false).applySetting("hibernate.hbm2ddl.auto","none").build();
        try(var factory=new MetadataSources(registry).addAnnotatedClass(SavedPlan.class).addAnnotatedClass(TourReview.class)
                .addAnnotatedClass(User.class).addAnnotatedClass(Role.class).addAnnotatedClass(Tour.class).addAnnotatedClass(TourSchedule.class)
                .addAnnotatedClass(Booking.class)
                .addAnnotatedClass(com.trekkingcamping.backend.module.chat.entity.ChatSession.class)
                .addAnnotatedClass(com.trekkingcamping.backend.module.chat.entity.ChatBookingDraft.class)
                .addAnnotatedClass(com.trekkingcamping.backend.module.booking.entity.PaymentTransaction.class)
                .addAnnotatedClass(com.trekkingcamping.backend.module.booking.entity.ParticipationDeclaration.class)
                .addAnnotatedClass(com.trekkingcamping.backend.module.booking.entity.ParticipationAudit.class)
                .buildMetadata().buildSessionFactory();var session=factory.openSession()) {
            assertDoesNotThrow(()->session.createQuery("select p from SavedPlan p where p.user.email = :email",SavedPlan.class));
            assertDoesNotThrow(()->session.createQuery("select avg(r.rating) from TourReview r where r.tour.id = :id and r.isApproved = true",Double.class));
            for(var method:com.trekkingcamping.backend.module.booking.repository.BookingRepository.class.getMethods()) {
                var q=method.getAnnotation(org.springframework.data.jpa.repository.Query.class);
                if(q!=null)assertDoesNotThrow(()->session.createQuery(q.value()));
            }
        }finally{StandardServiceRegistryBuilder.destroy(registry);}
    }
}
