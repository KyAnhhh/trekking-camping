package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@Service
public class PassengerService {
    public record Names(List<String> fullNames,Long revision) {}
    public record Mark(String status,Long revision) {}
    public record Person(Long id,int position,String fullName,String status,long revision,Instant markedAt) {}
    public record Roster(int expectedCount,long revision,List<Person> passengers,boolean editable,boolean canCheckIn) {}
    public record Audit(Long id,String passengerName,String guideName,String previousStatus,String status,Instant createdAt) {}
    public record History(List<Audit> items,int page,int totalPages,long totalElements) {}
    private final BookingRepository bookings;
    private final BookingPassengerRepository passengers;
    private final PassengerAttendanceAuditRepository audits;
    private final GuideRepository guides;
    private final ScheduleGuideRepository assignments;
    private final TourScheduleRepository schedules;
    private final UserRepository users;
    private final EntityManager em;
    public PassengerService(BookingRepository bookings,BookingPassengerRepository passengers,PassengerAttendanceAuditRepository audits,
            GuideRepository guides,ScheduleGuideRepository assignments,TourScheduleRepository schedules,UserRepository users,EntityManager em) {
        this.bookings=bookings;this.passengers=passengers;this.audits=audits;this.guides=guides;
        this.assignments=assignments;this.schedules=schedules;this.users=users;this.em=em;
    }
    @Transactional(readOnly=true)
    public Roster ownerRoster(String email,Long id,boolean admin) {
        var b=owned(email,id,admin,false);var rows=passengers.findByBookingIdOrderByPositionAsc(id);
        return roster(b,rows,editable(b,rows,admin),false);
    }
    @Transactional
    public Roster saveNames(String email,Long id,boolean admin,Names input) {
        var b=owned(email,id,admin,true);
        var schedule=schedules.findByIdForUpdate(b.getSchedule().getId()).orElseThrow(this::missing);em.refresh(schedule);
        var rows=passengers.findByBookingIdOrderByPositionAsc(id);
        if(!editable(b,rows,admin)) throw conflict("Chỉ cập nhật danh sách trước khi điểm danh, khi đơn còn hiệu lực và trong thời hạn cho phép.");
        if(input==null || input.revision()==null || input.fullNames()==null || input.fullNames().size()!=b.getNumberOfPax()
                || input.fullNames().size()>500 || input.fullNames().stream().anyMatch(n->n==null || n.isBlank() || n.length()>150 || n.chars().anyMatch(Character::isISOControl)))
            throw new IllegalArgumentException("Nhập đủ họ tên từng hành khách theo số chỗ đã đặt, tối đa 150 ký tự mỗi tên.");
        if(input.revision()!=revision(b)) throw conflict("Danh sách đã thay đổi. Tải lại trước khi lưu.");
        if(!rows.isEmpty() && rows.size()!=b.getNumberOfPax()) throw conflict("Danh sách không khớp số chỗ. Liên hệ quản trị viên kiểm tra.");
        for(int i=0;i<input.fullNames().size();i++) {
            BookingPassenger p=rows.isEmpty()?new BookingPassenger():rows.get(i);
            p.setBooking(b);p.setPosition(i+1);p.setFullName(input.fullNames().get(i).trim());passengers.save(p);
        }
        b.setPassengerRevision(revision(b)+1);bookings.save(b);passengers.flush();
        return roster(b,passengers.findByBookingIdOrderByPositionAsc(id),true,false);
    }
    @Transactional(readOnly=true)
    public Roster guideRoster(String email,Long scheduleId,Long bookingId) {
        var access=guideAccess(email,scheduleId,bookingId,false);
        var rows=passengers.findByBookingIdOrderByPositionAsc(bookingId);
        return roster(access.booking(),rows,false,canMark(access.booking()) && rows.size()==access.booking().getNumberOfPax());
    }
    @Transactional
    public Person mark(String email,Long scheduleId,Long bookingId,Long passengerId,Mark input) {
        var access=guideAccess(email,scheduleId,bookingId,true); var b=access.booking();
        var rows=passengers.findByBookingIdOrderByPositionAsc(bookingId);
        var p=rows.stream().filter(x->x.getId().equals(passengerId)).findFirst().orElseThrow(this::missing);
        if(!canMark(b) || rows.size()!=b.getNumberOfPax()) throw conflict("Chỉ điểm danh danh sách đầy đủ của đơn đã xác nhận, từ ngày trước khởi hành đến hết ngày kết thúc.");
        if(input==null || input.revision()==null || input.status()==null || !Set.of("NOT_CHECKED","PRESENT","ABSENT").contains(input.status())) throw new IllegalArgumentException("Trạng thái hoặc phiên bản điểm danh không hợp lệ.");
        if(input.revision()!=p.getRevision()) throw conflict("Điểm danh đã thay đổi. Tải lại danh sách trước khi lưu.");
        if(input.status().equals(p.getAttendanceStatus())) return person(p);
        Instant now=Instant.now();
        var audit=new PassengerAttendanceAudit();audit.setBooking(b);audit.setPassenger(p);audit.setGuide(access.guide());
        audit.setPreviousStatus(p.getAttendanceStatus());audit.setStatus(input.status());audit.setRevision(p.getRevision()+1);audit.setCreatedAt(now);
        p.setAttendanceStatus(input.status());p.setRevision(p.getRevision()+1);p.setMarkedAt(now);
        passengers.save(p);audits.save(audit);
        return person(p);
    }
    @Transactional(readOnly=true)
    public History ownerHistory(String email,Long id,boolean admin,int page) {owned(email,id,admin,false);return history(id,page);}
    @Transactional(readOnly=true)
    public History guideHistory(String email,Long scheduleId,Long bookingId,int page) {guideAccess(email,scheduleId,bookingId,false);return history(bookingId,page);}
    private History history(Long id,int page) {
        if(page<0 || page>10000) throw new IllegalArgumentException("Trang không hợp lệ.");
        var result=audits.findByBookingIdOrderByIdDesc(id,PageRequest.of(page,20)).map(a->new Audit(a.getId(),a.getPassenger().getFullName(),a.getGuide().getFullName(),a.getPreviousStatus(),a.getStatus(),a.getCreatedAt()));
        return new History(result.getContent(),page,result.getTotalPages(),result.getTotalElements());
    }
    private Booking owned(String email,Long id,boolean admin,boolean lock) {
        var u=user(email);if(admin && !role(u,"ROLE_ADMIN")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var b=(lock?bookings.findByIdForUpdate(id):bookings.findById(id)).orElseThrow(this::missing);if(lock)em.refresh(b);
        if(!admin && (b.getUser()==null || !u.getId().equals(b.getUser().getId())))throw missing();
        return b;
    }
    private record Access(Booking booking,Guide guide) {}
    private Access guideAccess(String email,Long scheduleId,Long bookingId,boolean lock) {
        var u=user(email);if(!role(u,"ROLE_GUIDE"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var g=guides.findByUserId(u.getId()).filter(Guide::getActive).orElseThrow(this::missing);
        var b=(lock?bookings.findByIdForUpdate(bookingId):bookings.findById(bookingId)).orElseThrow(this::missing);
        if(lock) {
            em.refresh(b);
            var s=schedules.findByIdForUpdate(scheduleId).orElseThrow(this::missing);em.refresh(s);
            g=guides.lockById(g.getId()).orElseThrow(this::missing);em.refresh(g);em.refresh(u);
        }
        if(!Boolean.TRUE.equals(u.getIsActive()) || !role(u,"ROLE_GUIDE") || !g.getActive() || g.getUser()==null || !u.getId().equals(g.getUser().getId())
                || !Objects.equals(b.getSchedule().getId(),scheduleId) || !Set.of("CONFIRMED","COMPLETED").contains(b.getStatus())
                || !assignments.existsByScheduleIdAndGuideId(scheduleId,g.getId()))throw missing();
        return new Access(b,g);
    }
    private User user(String email) {return users.findByEmail(email).filter(u->Boolean.TRUE.equals(u.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));}
    private boolean role(User u,String role) {return u.getRole()!=null && (role.equals(u.getRole().getName()) || role.substring(5).equals(u.getRole().getName()));}
    private boolean editable(Booking b,List<BookingPassenger> rows,boolean admin) {
        var s=b.getSchedule();LocalDate cutoff=admin?s.getReturnDate():s.getDepartureDate();
        return Set.of("PENDING","CONFIRMED").contains(b.getStatus()) && !"CANCELLED".equals(s.getStatus()) && cutoff!=null
                && (admin?!today().isAfter(cutoff):today().isBefore(cutoff)) && rows.stream().noneMatch(p->p.getMarkedAt()!=null);
    }
    private boolean canMark(Booking b) {
        TourSchedule s=b.getSchedule();var today=today();
        return "CONFIRMED".equals(b.getStatus()) && Set.of("OPEN","FULL","CLOSED").contains(s.getStatus()) && s.getDepartureDate()!=null && s.getReturnDate()!=null
                && !today.isBefore(s.getDepartureDate().minusDays(1)) && !today.isAfter(s.getReturnDate());
    }
    private Roster roster(Booking b,List<BookingPassenger> rows,boolean edit,boolean mark) {return new Roster(b.getNumberOfPax(),revision(b),rows.stream().map(this::person).toList(),edit,mark);}
    private Person person(BookingPassenger p) {return new Person(p.getId(),p.getPosition(),p.getFullName(),p.getAttendanceStatus(),p.getRevision(),p.getMarkedAt());}
    private long revision(Booking b) {return b.getPassengerRevision()==null?0:b.getPassengerRevision();}
    private LocalDate today() {return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    private ResponseStatusException missing() {return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy danh sách hoặc bạn không có quyền xem đoàn này.");}
    private ResponseStatusException conflict(String message) {return new ResponseStatusException(HttpStatus.CONFLICT,message);}
}
