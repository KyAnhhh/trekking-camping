package com.trekkingcamping.backend.module.guide.service;

import com.trekkingcamping.backend.module.guide.dto.GuideDtos.*;
import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GuideService {
    private final com.trekkingcamping.backend.module.notification.service.NotificationService notifications;
    private final GuideRepository guides;
    private final ScheduleGuideRepository assignments;
    private final TourScheduleRepository schedules;
    private final TourRepository tours;
    private final GuideImageStorage images;
    private final jakarta.persistence.EntityManager entityManager;
    public GuideService(GuideRepository guides, ScheduleGuideRepository assignments,
                        TourScheduleRepository schedules, TourRepository tours, GuideImageStorage images, jakarta.persistence.EntityManager entityManager, com.trekkingcamping.backend.module.notification.service.NotificationService notifications) {
        this.notifications=notifications;
        this.guides = guides; this.assignments = assignments; this.schedules = schedules; this.tours = tours; this.images = images;
        this.entityManager = entityManager;
    }
    @Transactional(readOnly = true)
    public List<AdminProfile> list() { return guides.findAllByOrderByFullNameAsc().stream().map(AdminProfile::from).toList(); }
    @Transactional(readOnly = true)
    public PublicProfile profile(Long id) { return PublicProfile.from(guides.findById(id).orElseThrow(this::notFound)); }
    @Transactional
    public AdminProfile create(Edit r) {
        validate(r);
        if (guides.existsByCode(r.code().trim())) throw conflict("Mã hướng dẫn viên đã tồn tại.");
        Guide g = new Guide(); apply(g, r); return AdminProfile.from(guides.save(g));
    }
    @Transactional
    public AdminProfile update(Long id, Edit r) {
        validate(r);
        Guide g = guides.lockById(id).orElseThrow(this::notFound);
        if (!g.getCode().equals(r.code().trim())) throw new IllegalArgumentException("Không thay đổi mã hướng dẫn viên đã tạo.");
        if (!r.active() && assignments.countFuture(id, today()) > 0) throw conflict("Cần chuyển các chuyến chưa kết thúc cho người khác trước khi ngừng hoạt động.");
        apply(g, r); return AdminProfile.from(guides.save(g));
    }
    @Transactional(rollbackFor = Exception.class)
    public AdminProfile upload(Long id, MultipartFile file) throws IOException {
        Guide g = guides.lockById(id).orElseThrow(this::notFound);
        String previous = g.getAvatarUrl(), url = images.save(file);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) images.remove(url); }
            @Override public void afterCommit() { images.remove(previous); }
        });
        g.setAvatarUrl(url); return AdminProfile.from(guides.save(g));
    }
    @Transactional
    public Team assign(Long scheduleId, List<Assignment> requested) {
        validateAssignments(requested);
        TourSchedule schedule = schedules.findByIdForUpdate(scheduleId).orElseThrow(this::notFound);
        if (schedule.getDepartureDate() == null || schedule.getReturnDate() == null
                || schedule.getReturnDate().isBefore(schedule.getDepartureDate())) throw conflict("Lịch khởi hành thiếu ngày hợp lệ.");
        if (!schedule.getDepartureDate().isAfter(today()) || "CANCELLED".equals(schedule.getStatus())) throw conflict("Chỉ phân công cho chuyến chưa khởi hành và chưa hủy.");
        var old = assignments.forSchedules(List.of(scheduleId));
        Map<String, Guide> selected = new HashMap<>();
        for (Assignment a : requested) selected.put(a.guideCode(), guides.findByCode(a.guideCode()).orElseThrow(this::notFound));
        // All writers lock each affected guide in ID order before checking dates.
        Set<Long> ids = new TreeSet<>();
        old.forEach(a -> ids.add(a.getGuide().getId())); selected.values().forEach(g -> ids.add(g.getId()));
        Map<Long, Guide> locked = new HashMap<>();
        for (Long id : ids) {
            Guide fresh = guides.lockById(id).orElseThrow(this::notFound);
            entityManager.refresh(fresh);
            locked.put(id, fresh);
        }
        List<ScheduleGuide> next = new ArrayList<>();
        for (Assignment a : requested) {
            Guide g = locked.get(selected.get(a.guideCode()).getId());
            if (!g.getActive()) throw conflict("Hướng dẫn viên đã ngừng nhận chuyến.");
            if (assignments.countConflicts(g.getId(), scheduleId, schedule.getDepartureDate(), schedule.getReturnDate()) > 0) throw conflict("Hướng dẫn viên " + g.getCode() + " đã được phân công trong khoảng ngày này.");
            next.add(new ScheduleGuide(schedule, g, a.role()));
        }
        assignments.deleteAll(old); assignments.flush(); assignments.saveAll(next);
        String change=UUID.randomUUID().toString();
        for(Guide g:locked.values()) {
            String before=old.stream().filter(a->a.getGuide().getId().equals(g.getId())).map(ScheduleGuide::getRole).findFirst().orElse(null);
            String after=next.stream().filter(a->a.getGuide().getId().equals(g.getId())).map(ScheduleGuide::getRole).findFirst().orElse(null);
            if(g.getUser()!=null && !Objects.equals(before,after))
                notifications.emit(g.getUser(),"assignment:"+scheduleId+":"+change,"Cập nhật phân công hướng dẫn",
                    after==null?"Bạn đã được gỡ khỏi lịch phân công. Xem lịch làm việc hiện tại.":"Bạn có phân công mới hoặc thay đổi vai trò. Đăng nhập để xem lịch làm việc.","/guide-workspace");
        }
        // Explicit replacement removes legacy data; old rows are otherwise left untouched.
        schedule.setGuideName(null); schedule.setGuidePhone(null);
        return new Team(next.stream().map(this::member).toList(), null, null);
    }
    public static void validateAssignments(List<Assignment> requested) {
        if (requested == null || requested.size() > 10) throw new IllegalArgumentException("Danh sách phân công tối đa 10 người.");
        Set<String> codes = new HashSet<>(); int leaders = 0;
        for (Assignment a : requested) {
            if (a == null || a.guideCode() == null || !a.guideCode().matches("[A-Z0-9_-]{2,40}")
                    || a.role() == null || !Set.of("LEAD", "ASSISTANT").contains(a.role())) throw new IllegalArgumentException("Mã hướng dẫn viên hoặc vai trò không hợp lệ.");
            if (!codes.add(a.guideCode())) throw new IllegalArgumentException("Không phân công trùng một hướng dẫn viên.");
            if ("LEAD".equals(a.role())) leaders++;
        }
        if (!requested.isEmpty() && leaders != 1) throw new IllegalArgumentException("Mỗi đội cần đúng một trưởng đoàn.");
    }
    @Transactional(readOnly = true)
    public List<Schedule> publicSchedules(Long tourId) {
        tours.findById(tourId).filter(t -> Boolean.TRUE.equals(t.getIsActive())).orElseThrow(this::notFound);
        return scheduleRows(tourId);
    }
    @Transactional(readOnly = true)
    public List<Schedule> adminSchedules(Long tourId) {
        tours.findById(tourId).orElseThrow(this::notFound);
        return scheduleRows(tourId);
    }
    private List<Schedule> scheduleRows(Long tourId) {
        var rows = schedules.findByTourId(tourId);
        var grouped = members(rows.stream().map(TourSchedule::getId).toList());
        return rows.stream().map(s -> new Schedule(s.getId(), s.getDepartureDate(), s.getReturnDate(), s.getAvailableSlots(),
                s.getStatus(), s.getGuideName(), grouped.getOrDefault(s.getId(), List.of()),s.getPickupAt(),s.getPickupPoint())).toList();
    }
    @Transactional(readOnly = true)
    public Team team(Long scheduleId) {
        var s = schedules.findById(scheduleId).orElseThrow(this::notFound);
        return new Team(members(List.of(scheduleId)).getOrDefault(scheduleId, List.of()), s.getGuideName(), s.getGuidePhone());
    }
    private Map<Long, List<Member>> members(List<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return assignments.forSchedules(ids).stream().collect(Collectors.groupingBy(a -> a.getSchedule().getId(), Collectors.mapping(this::member, Collectors.toList())));
    }
    @Transactional(readOnly = true)
    public BookingTeam bookingTeam(Long scheduleId, boolean contactAllowed) {
        var s = schedules.findById(scheduleId).orElseThrow(this::notFound);
        var contacts = assignments.forSchedules(List.of(scheduleId)).stream().map(a -> new Contact(
                PublicProfile.from(a.getGuide()), a.getRole(), contactAllowed ? a.getGuide().getPhone() : null)).toList();
        return new BookingTeam(contacts, s.getGuideName(), contactAllowed ? s.getGuidePhone() : null);
    }
    private Member member(ScheduleGuide a) { return new Member(PublicProfile.from(a.getGuide()), a.getRole()); }
    void validate(Edit r) {
        if (r == null) throw new IllegalArgumentException("Thiếu hồ sơ hướng dẫn viên.");
        if (r.code() == null || !r.code().matches("[A-Z0-9_-]{2,40}")) throw new IllegalArgumentException("Mã gồm 2–40 chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.");
        text(r.fullName(), 150, true); text(r.bio(), 4000, false); text(r.specialties(), 500, false); text(r.languages(), 200, false);
        text(r.phone(), 30, false); text(r.email(), 254, false);
        if (r.phone() != null && !r.phone().isBlank() && !r.phone().matches("[+0-9 ().-]{6,30}")) throw new IllegalArgumentException("Số điện thoại không hợp lệ.");
        if (r.email() != null && !r.email().isBlank() && !r.email().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Email không hợp lệ.");
        if (r.experienceSince() != null && (r.experienceSince() < 1960 || r.experienceSince() > today().getYear())) throw new IllegalArgumentException("Năm bắt đầu kinh nghiệm không hợp lệ.");
        if (r.active() == null) throw new IllegalArgumentException("Thiếu trạng thái hoạt động.");
    }
    private void text(String value, int max, boolean required) { if ((required && (value == null || value.isBlank())) || (value != null && value.length() > max)) throw new IllegalArgumentException("Thông tin hồ sơ bị thiếu hoặc quá dài."); }
    private void apply(Guide g, Edit r) {
        g.setCode(r.code().trim()); g.setFullName(r.fullName().trim()); g.setBio(r.bio()); g.setExperienceSince(r.experienceSince());
        g.setSpecialties(r.specialties()); g.setLanguages(r.languages()); g.setPhone(r.phone()); g.setEmail(r.email()); g.setActive(r.active());
    }
    private LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hướng dẫn viên hoặc chuyến đi."); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
