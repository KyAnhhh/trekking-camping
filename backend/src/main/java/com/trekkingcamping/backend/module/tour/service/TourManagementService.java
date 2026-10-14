package com.trekkingcamping.backend.module.tour.service;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.dto.CreateTourRequestDto;
import com.trekkingcamping.backend.module.tour.repository.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.guide.repository.ScheduleGuideRepository;
import com.trekkingcamping.backend.module.guide.service.GuideService;
import com.trekkingcamping.backend.module.guide.dto.GuideDtos;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@Service
public class TourManagementService {
    public record Detail(Tour tour, List<TourItinerary> itineraries, List<GuideDtos.Schedule> schedules, List<TourGear> gears) {}
    public record ScheduleEdit(LocalDate departureDate, LocalDate returnDate, Integer availableSlots, String status, LocalDateTime pickupAt,String pickupPoint) {
        public ScheduleEdit(LocalDate departure,LocalDate returns,Integer slots,String status) { this(departure,returns,slots,status,null,null); }
    }
    public record Active(Boolean active) {}
    private final TourRepository tours; private final TourScheduleRepository schedules;
    private final TourItineraryRepository itineraries; private final TourGearRepository gears;
    private final BookingRepository bookings; private final ScheduleGuideRepository assignments;
    private final GuideService guides; private final EntityManager em;
    public TourManagementService(TourRepository tours, TourScheduleRepository schedules, TourItineraryRepository itineraries,
            TourGearRepository gears, BookingRepository bookings, ScheduleGuideRepository assignments, GuideService guides, EntityManager em) {
        this.tours=tours; this.schedules=schedules; this.itineraries=itineraries; this.gears=gears;
        this.bookings=bookings; this.assignments=assignments; this.guides=guides; this.em=em;
    }
    @Transactional(readOnly=true) public List<Tour> list() { return tours.findAll(org.springframework.data.domain.Sort.by("id").descending()); }
    @Transactional(readOnly=true) public Detail detail(String slug) {
        Tour t=tours.findBySlug(slug).orElseThrow(this::notFound);
        return new Detail(t,itineraries.findByTourIdOrderByDayNumberAsc(t.getId()),guides.adminSchedules(t.getId()),gears.findByTourId(t.getId()));
    }
    @Transactional public Tour update(Long id, CreateTourRequestDto r) {
        TourValidation.tour(r);
        Tour t=locked(id);
        if (!Objects.equals(t.getSlug(),r.getSlug())) throw conflict("Slug được giữ cố định để bảo toàn liên kết tour và booking.");
        var rows=lockSchedules(id);
        // Do not silently invalidate the participation requirements already accepted by travellers.
        if (r.getAdventureProfile()!=null && !r.getAdventureProfile().sameAs(t.getAdventureProfile())
                && rows.stream().anyMatch(s -> s.getReturnDate()!=null && !s.getReturnDate().isBefore(today())
                && bookings.existsByScheduleIdAndStatusNot(s.getId(),"CANCELLED")))
            throw conflict("Tour còn booking chưa kết thúc. Xử lý các đơn trước khi thay đổi thông số hoặc yêu cầu tham gia.");
        if (r.getAdventureProfile()!=null) t.setAdventureProfile(r.getAdventureProfile());
        if (!rows.isEmpty() && (!Objects.equals(t.getDurationDays(),r.getDurationDays()) || !Objects.equals(t.getDurationNights(),r.getDurationNights())
                || !Objects.equals(t.getMaxCapacity(),r.getMaxCapacity())))
            throw conflict("Tour đã có lịch khởi hành: giữ nguyên thời lượng và sức chứa. Tạo tour mới nếu cần thay đổi cấu trúc chuyến đi.");
        t.setTitle(r.getTitle().trim()); t.setLocation(r.getLocation().trim()); t.setPricePerPax(r.getPricePerPax());
        t.setDurationDays(r.getDurationDays()); t.setDurationNights(r.getDurationNights()); t.setMaxCapacity(r.getMaxCapacity());
        if (!Objects.equals(t.getDifficultyLevel(),r.getDifficultyLevel()) && rows.stream().anyMatch(s -> s.getReturnDate()!=null
                && !s.getReturnDate().isBefore(today()) && bookings.existsByScheduleIdAndStatusNot(s.getId(),"CANCELLED")))
            throw conflict("Không thay đổi độ khó khi có khách đã đặt lịch chưa kết thúc.");
        t.setDifficultyLevel(r.getDifficultyLevel()); t.setSummary(r.getSummary()); t.setDescription(r.getDescription());
        t.setSafetyTips(r.getSafetyTips()); t.setRequiredGear(r.getRequiredGear()); t.setInsuranceInfo(r.getInsuranceInfo());
        t.setEmergencyHotline(r.getEmergencyHotline()); t.setUpdatedAt(LocalDateTime.now());
        return tours.save(t);
    }
    @Transactional public Tour active(Long id, Active input) {
        if (input==null || input.active()==null) throw new IllegalArgumentException("Thiếu trạng thái mở bán.");
        Tour t=locked(id); var rows=lockSchedules(id);
        if (!input.active() && rows.stream().anyMatch(s -> s.getReturnDate()!=null && !s.getReturnDate().isBefore(today())
                && bookings.existsByScheduleIdAndStatusNot(s.getId(),"CANCELLED")))
            throw conflict("Tour còn khách đã đặt cho chuyến chưa kết thúc. Cần xử lý các booking trước khi ngừng mở bán.");
        t.setIsActive(input.active()); t.setUpdatedAt(LocalDateTime.now()); return tours.save(t);
    }
    @Transactional public void updateSchedule(Long tourId, Long scheduleId, ScheduleEdit input) {
        Tour t=locked(tourId);
        TourSchedule s=schedules.findByIdForUpdate(scheduleId).orElseThrow(this::notFound); em.refresh(s);
        if (!Objects.equals(s.getTour().getId(),tourId)) throw notFound();
        if ("CANCELLED".equals(s.getStatus()) || s.getDepartureDate()==null || !s.getDepartureDate().isAfter(today()))
            throw conflict("Không sửa lịch đã hủy hoặc đã khởi hành.");
        if (input==null || input.departureDate()==null || !input.departureDate().isAfter(today()) || input.returnDate()==null
                || java.time.temporal.ChronoUnit.DAYS.between(input.departureDate(),input.returnDate()) != t.getDurationDays()-1
                || input.availableSlots()==null || input.availableSlots()<0 || input.availableSlots()>t.getMaxCapacity()
                || input.status()==null || !Set.of("OPEN","FULL","CLOSED","CANCELLED").contains(input.status()))
            throw new IllegalArgumentException("Ngày về phải khớp thời lượng tour; số chỗ và trạng thái phải hợp lệ.");
        if ("FULL".equals(input.status()) && input.availableSlots()!=0) throw new IllegalArgumentException("Lịch đầy phải có 0 chỗ trống.");
        boolean dates=!Objects.equals(s.getDepartureDate(),input.departureDate()) || !Objects.equals(s.getReturnDate(),input.returnDate());
        TourValidation.pickup(input.pickupAt(),input.pickupPoint(),input.departureDate());
        if ((!Objects.equals(s.getPickupAt(),input.pickupAt()) || !Objects.equals(s.getPickupPoint(),input.pickupPoint())) && bookings.existsByScheduleId(scheduleId))
            throw conflict("Lịch đã có booking: không đổi điểm hoặc giờ đón âm thầm. Xử lý các đơn trước khi đổi lịch.");
        boolean slots=!Objects.equals(s.getAvailableSlots(),input.availableSlots());
        if ((dates || slots) && bookings.existsByScheduleId(scheduleId)) throw conflict("Lịch đã có booking: không sửa ngày hoặc số chỗ thủ công.");
        if (dates && !assignments.forSchedules(List.of(scheduleId)).isEmpty()) throw conflict("Gỡ phân công hướng dẫn viên trước khi đổi ngày, rồi phân công lại để kiểm tra trùng lịch.");
        if (!Objects.equals(s.getStatus(),input.status()) && bookings.existsByScheduleIdAndStatusNot(scheduleId,"CANCELLED"))
            throw conflict("Lịch còn booking. Không đóng hoặc đổi trạng thái trước khi xử lý các đơn.");
        s.setDepartureDate(input.departureDate()); s.setReturnDate(input.returnDate()); s.setAvailableSlots(input.availableSlots());
        s.setPickupAt(input.pickupAt()); s.setPickupPoint(input.pickupPoint());
        s.setStatus("OPEN".equals(input.status()) && input.availableSlots()==0 ? "FULL" : input.status()); schedules.save(s);
    }
    private Tour locked(Long id) { Tour t=tours.findByIdForUpdate(id).orElseThrow(this::notFound); em.refresh(t); return t; }
    private List<TourSchedule> lockSchedules(Long id) {
        return schedules.findByTourId(id).stream().sorted(Comparator.comparing(TourSchedule::getId)).map(s -> {
            var fresh=schedules.findByIdForUpdate(s.getId()).orElseThrow(this::notFound); em.refresh(fresh); return fresh;
        }).toList();
    }
    private LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tour hoặc lịch khởi hành."); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT,message); }
}
