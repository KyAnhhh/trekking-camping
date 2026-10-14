package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;

@Service
public class ParticipationService {
    public record Person(String name,String support,String notes,String emergencyName,String emergencyPhone,Boolean acknowledged) {}
    public record Submission(Long revision,List<Person> people) {}
    public record Review(Long revision,String decision,String note) {
        public Review(Long revision,String decision) { this(revision,decision,null); }
    }
    public record Packet(List<Person> people,String requirements,String consentVersion,String reviewNote) {}
    public record View(String status,long revision,LocalDateTime deadline,int numberOfPax,Packet declaration,String requirements,boolean editable) {}
    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final ParticipationRepository declarations;
    private final ParticipationAuditRepository audits;
    private final UserRepository users;
    private final EntityManager em;
    private final ObjectMapper json;
    private final HealthCipher cipher;
    public ParticipationService(BookingRepository bookings,PaymentTransactionRepository payments,ParticipationRepository declarations,
            ParticipationAuditRepository audits,UserRepository users,EntityManager em,ObjectMapper json,HealthCipher cipher) {
        this.bookings=bookings; this.payments=payments; this.declarations=declarations; this.audits=audits;
        this.users=users; this.em=em; this.json=json; this.cipher=cipher;
    }
    @Transactional public View get(String email,Long id,boolean admin) {
        User user=user(email,admin); Booking b=locked(id); authorize(b,user,admin);
        Packet p=packet(id); audit(b,user,"READ");
        return view(b,p);
    }
    @Transactional public View submit(String email,Long id,Submission input) {
        User user=user(email,false); Booking b=locked(id); authorize(b,user,false); mutable(b);
        if (input==null) throw invalid(); revision(b,input.revision()); validate(input.people(),b.getNumberOfPax());
        Packet packet=new Packet(input.people(),requirements(b),"participation-v1",null);
        var row=declarations.findById(id).orElseGet(ParticipationDeclaration::new); row.setBookingId(id);
        try { row.setEncryptedContent(cipher.encrypt(id,json.writeValueAsString(packet))); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw invalid(); }
        row.setPurgeAfter(b.getSchedule().getReturnDate().plusDays(31).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
        declarations.save(row);
        b.setParticipationRevision(revisionOf(b)+1); b.setParticipationStatus("REVIEW_REQUIRED");
        if(b.getParticipationDeadline()==null) b.setParticipationDeadline(ParticipationGate.deadline(b.getSchedule().getDepartureDate(),48));
        bookings.save(b); audit(b,user,"SUBMIT"); return view(b,packet);
    }
    @Transactional public View review(String email,Long id,Review input) {
        User user=user(email,true); Booking b=locked(id); mutable(b);
        if(input==null || input.decision()==null || !Set.of("READY","NEEDS_CONTACT","UNSUPPORTED").contains(input.decision())) throw invalid();
        revision(b,input.revision()); Packet p=packet(id);
        if(p==null) throw conflict("Khách chưa gửi khai báo đầy đủ.");
        validate(p.people(),b.getNumberOfPax());
        if(!Objects.equals(p.requirements(),requirements(b))) throw conflict("Yêu cầu tour đã thay đổi. Khách cần xác nhận lại khai báo.");
        if(input.note()!=null && input.note().length()>1000 || !"READY".equals(input.decision()) && (input.note()==null || input.note().isBlank()))
            throw new IllegalArgumentException("Nhập lý do/hướng dẫn tiếp theo cho khách khi cần trao đổi hoặc chưa thể đáp ứng, tối đa 1.000 ký tự.");
        p=new Packet(p.people(),p.requirements(),p.consentVersion(),input.note()==null?null:input.note().trim());
        var row=declarations.findById(id).orElseThrow(this::notFound);
        try { row.setEncryptedContent(cipher.encrypt(id,json.writeValueAsString(p))); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw invalid(); }
        declarations.save(row);
        b.setParticipationStatus(input.decision()); b.setParticipationRevision(revisionOf(b)+1);
        if("READY".equals(input.decision())) b.setParticipationDeadline(ParticipationGate.deadline(b.getSchedule().getDepartureDate(),24));
        bookings.save(b); audit(b,user,"REVIEW_"+input.decision()); return view(b,p);
    }
    @Transactional public void delete(String email,Long id) {
        User user=user(email,false); Booking b=locked(id); authorize(b,user,false);
        if(!Set.of("CANCELLED","COMPLETED").contains(b.getStatus())) throw conflict("Khai báo đang phục vụ chuyến đi. Hủy đơn chưa thanh toán trước, hoặc liên hệ người phụ trách để xử lý đơn đang hoạt động.");
        declarations.findById(id).ifPresent(declarations::delete); audit(b,user,"DELETE");
    }
    private View view(Booking b,Packet p) {
        return new View(b.getParticipationStatus()==null?"LEGACY":b.getParticipationStatus(),revisionOf(b),b.getParticipationDeadline(),b.getNumberOfPax(),p,requirements(b),editable(b));
    }
    private boolean editable(Booking b) { return "PENDING".equals(b.getStatus()) && !ParticipationGate.expired(b)
            && b.getSchedule().getDepartureDate().isAfter(now().toLocalDate()) && !hasPayment(b); }
    private void mutable(Booking b) { if(!editable(b)) throw conflict("Đơn đã thanh toán/đang đối soát, đã hết hạn hoặc không còn chờ. Liên hệ người phụ trách để thay đổi khai báo."); }
    private boolean hasPayment(Booking b) { return payments.findByBookingIdOrderByIdDesc(b.getId()).stream()
            .anyMatch(p->Set.of("PENDING","SUCCESS","REFUND_REQUIRED").contains(p.getStatus())); }
    private Packet packet(Long id) {
        var row=declarations.findById(id).orElse(null);
        if(row==null || !row.getPurgeAfter().isAfter(Instant.now())) return null;
        try { return json.readValue(cipher.decrypt(id,row.getEncryptedContent()),Packet.class); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa đọc được khai báo riêng tư."); }
    }
    private String requirements(Booking b) {
        var t=b.getSchedule().getTour(); var p=t.getAdventureProfile();
        return t.getTitle()+" · "+b.getSchedule().getDepartureDate()+" · "+t.getDurationDays()+" ngày · độ khó "+t.getDifficultyLevel()+"\n"
                +(b.getSchedule().getPickupAt()==null?"":"Đón: "+b.getSchedule().getPickupAt()+" (giờ Việt Nam), "+b.getSchedule().getPickupPoint()+"\n")
                +(p==null || p.getParticipationRequirements()==null?"Cần trao đổi trực tiếp với nhà tổ chức về yêu cầu và hỗ trợ.":p.getParticipationRequirements());
    }
    private Booking locked(Long id) { var b=bookings.findByIdForUpdate(id).orElseThrow(this::notFound); em.refresh(b); return b; }
    private User user(String email,boolean admin) {
        var user=users.findByEmail(email).filter(u->Boolean.TRUE.equals(u.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(admin && (user.getRole()==null || !"ROLE_ADMIN".equals(user.getRole().getName()))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }
    private void authorize(Booking b,User u,boolean admin) { if(!admin && !Objects.equals(b.getUser().getId(),u.getId())) throw notFound(); }
    private long revisionOf(Booking b) { return b.getParticipationRevision()==null?0:b.getParticipationRevision(); }
    private void revision(Booking b,Long revision) { if(revision==null || revision!=revisionOf(b)) throw conflict("Khai báo đã thay đổi. Tải lại trước khi tiếp tục."); }
    private void audit(Booking b,User u,String action) {
        var audit=new ParticipationAudit(); audit.setBookingId(b.getId()); audit.setActorId(u.getId()); audit.setRevision(revisionOf(b)); audit.setAction(action); audits.save(audit);
    }
    static void validate(List<Person> people,Integer pax) {
        if(people==null || pax==null || people.size()!=pax || people.size()>1000) throw invalid();
        for(Person p:people) if(p==null || !text(p.name(),150) || p.support()==null || !Set.of("NONE","SUPPORT","PRIVATE").contains(p.support())
                || p.notes()!=null && p.notes().length()>2000 || !text(p.emergencyName(),150) || p.emergencyPhone()==null
                || !p.emergencyPhone().matches("[+0-9 ().-]{6,30}") || !Boolean.TRUE.equals(p.acknowledged())) throw invalid();
    }
    private static boolean text(String s,int n) { return s!=null && !s.isBlank() && s.length()<=n; }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Khai báo đủ từng người, chọn nhu cầu hỗ trợ, liên hệ khẩn cấp và xác nhận được phép khai báo. Ghi chú tối đa 2.000 ký tự."); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy đơn."); }
    private ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT,m); }
    private LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
}
