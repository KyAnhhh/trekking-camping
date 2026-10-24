package com.trekkingcamping.backend.module.guide.service;

import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.*;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GuideWorkspaceService {
    public record PageResult<T>(List<T> items,int page,int totalPages,long totalElements) {
        static <T> PageResult<T> of(Page<T> p) {return new PageResult<>(p.getContent(),p.getNumber(),p.getTotalPages(),p.getTotalElements());}
    }
    public record Trip(Long id,String title,LocalDate departureDate,LocalDate returnDate,String status,String role,LocalDateTime pickupAt,String pickupPoint,Long assignmentId,String responseStatus,String responseReason) {}
    public record Response(Long assignmentId,String decision,String reason) {}
    public record Guest(Long bookingId,String code,String contactName,String contactPhone,int people,String status,Integer presentCount,long revision,Instant markedAt,int namedPassengers) {}
    public record Roster(Trip trip,PageResult<Guest> guests,boolean canCheckIn) {}
    public record CheckIn(Integer presentCount,Long revision) {}
    public record Account(Long userId,String email) {}
    public record LinkAccount(String email) {}
    private final GuideRepository guides;private final ScheduleGuideRepository assignments;
    private final TourScheduleRepository schedules;private final BookingRepository bookings;
    private final BookingAttendanceRepository attendance;private final UserRepository users;private final RoleRepository roles;
    private final NotificationService notifications;private final EntityManager em;
    private final GuideInvitationRepository invitations;
    private final com.trekkingcamping.backend.module.booking.repository.BookingPassengerRepository passengers;
    public GuideWorkspaceService(GuideRepository guides,ScheduleGuideRepository assignments,TourScheduleRepository schedules,
        BookingRepository bookings,BookingAttendanceRepository attendance,UserRepository users,RoleRepository roles,NotificationService notifications,EntityManager em,
        GuideInvitationRepository invitations,com.trekkingcamping.backend.module.booking.repository.BookingPassengerRepository passengers) {
        this.guides=guides;this.assignments=assignments;this.schedules=schedules;this.bookings=bookings;this.attendance=attendance;
        this.users=users;this.roles=roles;this.notifications=notifications;this.em=em;
        this.invitations=invitations;this.passengers=passengers;
    }
    @Transactional(readOnly=true) public Account account(String email,Long id) {
        require(email,"ROLE_ADMIN");var g=guides.findById(id).orElseThrow(GuideWorkspaceService::missing);
        return g.getUser()==null?new Account(null,null):new Account(g.getUser().getId(),g.getUser().getEmail());
    }
    @Transactional public Account link(String actor,Long id,LinkAccount input) {
        require(actor,"ROLE_ADMIN");if(input==null)throw new IllegalArgumentException("Thiếu thông tin tài khoản.");
        var g=guides.lockById(id).orElseThrow(GuideWorkspaceService::missing);em.refresh(g);
        invitations.findById(id).filter(i->"PENDING".equals(i.getStatus())).ifPresent(i->{i.setStatus("REVOKED");i.setTokenHash(null);invitations.save(i);});
        if(input.email()==null || input.email().isBlank()) {
            if(g.getUser()!=null) {
                var u=users.findByEmailForUpdate(g.getUser().getEmail()).orElseThrow(GuideWorkspaceService::missing);em.refresh(u);
                if(u.getRole()!=null && "ROLE_GUIDE".equals(u.getRole().getName()))u.setRole(roles.findByName("ROLE_USER").orElseThrow(GuideWorkspaceService::missing));
                u.setAuthVersion(u.getAuthVersion()+1);g.setUser(null);guides.save(g);
            }
            return new Account(null,null);
        }
        if(g.getUser()!=null)throw conflict("Hãy gỡ liên kết hiện tại trước khi liên kết tài khoản khác.");
        if(!g.getActive())throw conflict("Hồ sơ hướng dẫn viên đã ngừng hoạt động.");
        var u=users.findByEmailForUpdate(input.email().trim().toLowerCase(Locale.ROOT)).orElseThrow(GuideWorkspaceService::missing);em.refresh(u);
        if(!Boolean.TRUE.equals(u.getIsActive()) || u.getRole()==null || !Set.of("ROLE_USER","ROLE_GUIDE").contains(u.getRole().getName()))
            throw conflict("Chỉ liên kết tài khoản khách/hướng dẫn viên đang hoạt động; không đổi quyền quản trị viên.");
        if(guides.existsByUserId(u.getId()))throw conflict("Tài khoản đã được liên kết với hướng dẫn viên khác.");
        var role=roles.findByName("ROLE_GUIDE").orElseThrow(()->conflict("Chưa có ROLE_GUIDE. Khởi động lại backend để khởi tạo role và kiểm tra database đang kết nối."));
        u.setRole(role);u.setAuthVersion(u.getAuthVersion()+1);g.setUser(u);guides.save(g);
        notifications.emit(u,"guide-account:"+id+":"+u.getAuthVersion(),"Đã cấp quyền hướng dẫn viên","Đăng nhập lại để mở lịch làm việc được phân công.","/guide-workspace");
        return new Account(u.getId(),u.getEmail());
    }
    @Transactional(readOnly=true) public PageResult<Trip> trips(String email,int page) {
        var g=guide(email);
        return PageResult.of(assignments.findByGuideIdOrderByScheduleDepartureDateDesc(g.getId(),page(page)).map(a->new Trip(a.getSchedule().getId(),a.getSchedule().getTour().getTitle(),a.getSchedule().getDepartureDate(),a.getSchedule().getReturnDate(),a.getSchedule().getStatus(),a.getRole(),a.getSchedule().getPickupAt(),a.getSchedule().getPickupPoint(),a.getId(),a.getResponseStatus(),a.getResponseReason())));
    }
    @Transactional public void respond(String email,Long id,Response input) {
        if(input==null||input.assignmentId()==null||!Set.of("ACCEPTED","DECLINED").contains(Objects.toString(input.decision(),""))
            ||input.reason()!=null&&input.reason().length()>1000||"DECLINED".equals(input.decision())&&(input.reason()==null||input.reason().isBlank()))
            throw new IllegalArgumentException("Chọn nhận/từ chối; khi từ chối cần lý do tối đa 1000 ký tự.");
        var g=guide(email);
        var s=schedules.findByIdForUpdate(id).orElseThrow(GuideWorkspaceService::missing);em.refresh(s);
        g=guides.lockById(g.getId()).orElseThrow(GuideWorkspaceService::missing);em.refresh(g);
        if(!g.getActive()||g.getUser()==null||!email.equals(g.getUser().getEmail()))throw missing();
        var a=assignments.findByScheduleIdAndGuideId(id,g.getId()).orElseThrow(GuideWorkspaceService::missing);em.refresh(a);
        if(!input.assignmentId().equals(a.getId()))throw conflict("Phân công đã thay đổi. Tải lại lịch.");
        if(input.decision().equals(a.getResponseStatus()))return;
        if(!"PENDING".equals(a.getResponseStatus()))throw conflict("Đã phản hồi; liên hệ admin nếu cần thay đổi.");
        if(s.getDepartureDate()==null||!s.getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))||"CANCELLED".equals(s.getStatus()))throw conflict("Chuyến đã khởi hành hoặc bị hủy.");
        if("ACCEPTED".equals(input.decision())&&assignments.countConflicts(g.getId(),id,s.getDepartureDate(),s.getReturnDate())>0)throw conflict("Trùng lịch phân công. Liên hệ admin.");
        a.respond(input.decision(),input.reason()==null?null:input.reason().trim());assignments.save(a);
        em.persist(new GuideAssignmentEvent(id,g.getId(),email,input.decision(),a.getResponseReason()));
        for(var admin:users.findByRoleNameAndIsActiveTrue("ROLE_ADMIN"))notifications.emit(admin,"guide-response:"+a.getId()+":"+input.decision(),
            "Hướng dẫn viên đã phản hồi lịch","Phân công lịch #"+id+": "+("ACCEPTED".equals(input.decision())?"đã nhận đoàn":"từ chối; xem lý do trong quản trị"),"/admin/guide-assignments");
    }
    @Transactional(readOnly=true) public Roster roster(String email,Long id,int page) {
        var g=guide(email);var s=schedules.findById(id).orElseThrow(GuideWorkspaceService::missing);assigned(g,id);
        var list=bookings.findByScheduleIdAndStatusInOrderByIdAsc(id,List.of("CONFIRMED","COMPLETED"),page(page));
        var marks=list.isEmpty()?Map.<Long,BookingAttendance>of():attendance.findByBookingIdIn(list.map(b->b.getId()).toList()).stream()
            .collect(Collectors.toMap(BookingAttendance::getBookingId,a->a));
        var named=list.isEmpty()?Map.<Long,List<com.trekkingcamping.backend.module.booking.entity.BookingPassenger>>of():passengers.findByBookingIdIn(list.map(b->b.getId()).toList()).stream()
            .collect(Collectors.groupingBy(p->p.getBooking().getId()));
        var rows=list.map(b->{var mark=marks.get(b.getId());var names=named.getOrDefault(b.getId(),List.of());
            Integer present=null;
            if(!names.isEmpty())present=(int)names.stream().filter(p->"PRESENT".equals(p.getAttendanceStatus())).count();
            else if(mark!=null)present=mark.getPresentCount();
            var marked=names.isEmpty()?(mark==null?null:mark.getMarkedAt()):names.stream().map(p->p.getMarkedAt()).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
            return new Guest(b.getId(),b.getBookingCode(),b.getContactName(),operational(s)?b.getContactPhone():null,b.getNumberOfPax(),b.getStatus(),present,mark==null?0:mark.getRevision(),marked,names.size());});
        return new Roster(trip(s,null),PageResult.of(rows),operational(s));
    }
    @Transactional public void checkIn(String email,Long scheduleId,Long bookingId,CheckIn input) {
        // Match booking/payment lock order: booking -> schedule -> guide. Assignment changes lock schedule -> guide.
        var g=guide(email);var b=bookings.findByIdForUpdate(bookingId).orElseThrow(GuideWorkspaceService::missing);em.refresh(b);
        var s=schedules.findByIdForUpdate(scheduleId).orElseThrow(GuideWorkspaceService::missing);em.refresh(s);
        g=guides.lockById(g.getId()).orElseThrow(GuideWorkspaceService::missing);em.refresh(g);
        if(!g.getActive() || g.getUser()==null || !email.equals(g.getUser().getEmail()))throw missing();
        assigned(g,scheduleId);
        if(!Objects.equals(b.getSchedule().getId(),scheduleId))throw missing();
        if(passengers.existsByBookingId(bookingId))throw conflict("Đơn đã có danh sách hành khách. Hãy điểm danh từng người.");
        if(!"CONFIRMED".equals(b.getStatus()) || !operational(s))throw conflict("Chỉ điểm danh đơn đã xác nhận, từ ngày trước khởi hành đến hết ngày kết thúc.");
        if(input==null || input.presentCount()==null || input.presentCount()<0 || input.presentCount()>b.getNumberOfPax() || input.revision()==null)
            throw new IllegalArgumentException("Số khách có mặt phải từ 0 đến số khách trong đơn; cần phiên bản hiện tại.");
        var mark=attendance.findById(bookingId).orElseGet(BookingAttendance::new);
        if(mark.getRevision()!=input.revision())throw conflict("Điểm danh đã thay đổi. Tải lại danh sách trước khi lưu.");
        mark.setBookingId(bookingId);mark.setPresentCount(input.presentCount());mark.setRevision(mark.getRevision()+1);
        mark.setMarkedByGuideId(g.getId());mark.setMarkedAt(Instant.now());attendance.save(mark);
    }
    private Guide guide(String email) {
        var u=require(email,"ROLE_GUIDE");return guides.findByUserId(u.getId()).filter(Guide::getActive).orElseThrow(GuideWorkspaceService::missing);
    }
    private User require(String email,String role) {
        var u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(u.getRole()==null || !role.equals(u.getRole().getName()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);return u;
    }
    private void assigned(Guide g,Long schedule) {if(!assignments.existsByScheduleIdAndGuideId(schedule,g.getId()))throw missing();}
    private boolean operational(TourSchedule s) {
        var today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));return Set.of("OPEN","FULL","CLOSED").contains(Objects.toString(s.getStatus(),""))
            && s.getDepartureDate()!=null && s.getReturnDate()!=null && !today.isBefore(s.getDepartureDate().minusDays(1)) && !today.isAfter(s.getReturnDate());
    }
    private Trip trip(TourSchedule s,String role) {return new Trip(s.getId(),s.getTour().getTitle(),s.getDepartureDate(),s.getReturnDate(),s.getStatus(),role,s.getPickupAt(),s.getPickupPoint(),null,null,null);}
    private static PageRequest page(int n) {if(n<0 || n>10000)throw new IllegalArgumentException("Trang không hợp lệ.");return PageRequest.of(n,20);}
    private static ResponseStatusException missing() {return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy dữ liệu hoặc bạn chưa được phân công.");}
    private static ResponseStatusException conflict(String m) {return new ResponseStatusException(HttpStatus.CONFLICT,m);}
}
