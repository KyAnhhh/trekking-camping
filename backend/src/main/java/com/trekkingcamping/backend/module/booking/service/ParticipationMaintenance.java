package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.entity.ParticipationAudit;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.Set;

@Service
public class ParticipationMaintenance {
    private final BookingRepository bookings; private final PaymentTransactionRepository payments;
    private final TourScheduleRepository schedules; private final ParticipationRepository declarations;
    private final ParticipationAuditRepository audits; private final EntityManager em;
    public ParticipationMaintenance(BookingRepository b,PaymentTransactionRepository p,TourScheduleRepository s,ParticipationRepository d,ParticipationAuditRepository a,EntityManager em) {
        bookings=b; payments=p; schedules=s; declarations=d; audits=a; this.em=em;
    }
    @Transactional public void expire(Long id) {
        var b=bookings.findByIdForUpdate(id).orElse(null); if(b==null)return; em.refresh(b);
        if(!"PENDING".equals(b.getStatus()) || !ParticipationGate.expired(b))return;
        if(payments.findByBookingIdOrderByIdDesc(id).stream().anyMatch(p->Set.of("PENDING","SUCCESS","REFUND_REQUIRED").contains(p.getStatus())))return;
        var s=schedules.findByIdForUpdate(b.getSchedule().getId()).orElseThrow(); em.refresh(s);
        s.setAvailableSlots(Math.addExact(s.getAvailableSlots(),b.getNumberOfPax()));
        if("FULL".equals(s.getStatus()))s.setStatus("OPEN"); schedules.save(s);
        b.setStatus("CANCELLED"); b.setUpdatedAt(LocalDateTime.now()); bookings.save(b); audit(id,"HOLD_EXPIRED");
    }
    @Transactional public void purge(Long id) {
        var b=bookings.findByIdForUpdate(id).orElse(null); if(b==null)return;
        var d=declarations.findById(id).orElse(null); if(d==null)return; em.refresh(d);
        if(d.getPurgeAfter().isAfter(Instant.now()))return;
        declarations.delete(d); audit(id,"RETENTION_PURGE");
    }
    private void audit(Long id,String action) { var a=new ParticipationAudit(); a.setBookingId(id); a.setAction(action); audits.save(a); }
}
