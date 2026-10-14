package com.trekkingcamping.backend.config;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.service.ParticipationMaintenance;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import java.time.*;

@Configuration @EnableScheduling
public class ParticipationJobs {
    private final BookingRepository bookings; private final ParticipationRepository declarations;
    private final ParticipationMaintenance maintenance;
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ParticipationJobs.class);
    public ParticipationJobs(BookingRepository b,ParticipationRepository d,ParticipationMaintenance m) { bookings=b; declarations=d; maintenance=m; }
    @Scheduled(initialDelay=60000,fixedDelay=60000)
    public void maintain() {
        for(var b:bookings.participationExpiryCandidates(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")),org.springframework.data.domain.PageRequest.of(0,100))) {
            try { maintenance.expire(b.getId()); } catch(RuntimeException e) { log.warn("Participation expiry deferred for booking {} ({})",b.getId(),e.getClass().getSimpleName()); }
        }
        for(var d:declarations.findTop100ByPurgeAfterBefore(Instant.now())) {
            try { maintenance.purge(d.getBookingId()); } catch(RuntimeException e) { log.warn("Participation retention deferred for booking {} ({})",d.getBookingId(),e.getClass().getSimpleName()); }
        }
    }
}
