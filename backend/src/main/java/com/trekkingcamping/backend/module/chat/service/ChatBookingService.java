package com.trekkingcamping.backend.module.chat.service;
import com.trekkingcamping.backend.module.chat.entity.ChatBookingDraft;
import com.trekkingcamping.backend.module.chat.repository.ChatBookingDraftRepository;
import com.trekkingcamping.backend.module.booking.service.BookingService;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.dto.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import com.trekkingcamping.backend.module.user.service.AccountService;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class ChatBookingService {
    public record Prepare(String requestId,Long scheduleId,Integer people) {}
    public record Confirm(boolean confirmed,String contactName,String contactEmail,String contactPhone) {}
    public record Quote(String draftId,String title,LocalDate departureDate,LocalDate returnDate,int people,
            BigDecimal unitPrice,BigDecimal totalAmount,Instant expiresAt,LocalDateTime pickupAt,String pickupPoint,
            String requirements,String contactName,String contactEmail,String contactPhone,Long bookingId) {}
    private final ChatBookingDraftRepository drafts; private final TourScheduleRepository schedules;
    private final TourRepository tours; private final BookingService service; private final BookingRepository bookings;
    private final AccountService accounts;
    private final jakarta.persistence.EntityManager em;
    public ChatBookingService(ChatBookingDraftRepository drafts,TourScheduleRepository schedules,TourRepository tours,
            BookingService service,BookingRepository bookings,AccountService accounts,jakarta.persistence.EntityManager em) {
        this.drafts=drafts;this.schedules=schedules;this.tours=tours;this.service=service;this.bookings=bookings;this.accounts=accounts;this.em=em;
    }
    @Transactional public Quote prepare(String email,Prepare input) {
        var owner=accounts.me(email);
        if(input==null || input.requestId()==null || !input.requestId().matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")
                || input.scheduleId()==null || input.people()==null || input.people()<1 || input.people()>50)
            throw new IllegalArgumentException("Chọn lịch và 1–50 khách hợp lệ.");
        var previous=drafts.locked(input.requestId());
        if(previous.isPresent()) {
            var d=previous.get(); requireOwner(d,owner.id());
            if(!d.getScheduleId().equals(input.scheduleId()) || d.getPeople()!=input.people()) throw conflict("Mã yêu cầu đã dùng cho lựa chọn khác.");
            if(!d.getExpiresAt().isAfter(Instant.now()) && d.getBookingId()==null) throw conflict("Bản tóm tắt đã hết hạn. Vui lòng lấy giá mới.");
            return quote(d,schedules.findById(d.getScheduleId()).orElseThrow(ChatBookingService::missing),owner);
        }
        var s=schedules.findById(input.scheduleId()).orElseThrow(ChatBookingService::missing); valid(s,input.people());
        var d=new ChatBookingDraft(); d.setId(input.requestId());d.setUserId(owner.id());d.setScheduleId(s.getId());d.setPeople(input.people());
        d.setUnitPrice(s.getTour().getPricePerPax());d.setTourUpdatedAt(s.getTour().getUpdatedAt());
        d.setDepartureDate(s.getDepartureDate());d.setReturnDate(s.getReturnDate());d.setPickupAt(s.getPickupAt());d.setPickupPoint(s.getPickupPoint());
        d.setExpiresAt(Instant.now().plusSeconds(600));drafts.saveAndFlush(d);
        return quote(d,s,owner);
    }
    @Transactional public BookingResponseDto confirm(String email,String id,Confirm input) {
        var owner=accounts.me(email);var d=drafts.locked(id).orElseThrow(ChatBookingService::missing);requireOwner(d,owner.id());
        if(input==null || !input.confirmed() || blank(input.contactName()) || input.contactName().length()>150
                || blank(input.contactEmail()) || input.contactEmail().length()>255 || blank(input.contactPhone()) || input.contactPhone().length()>20)
            throw new IllegalArgumentException("Xác nhận rõ ràng và nhập đủ thông tin liên hệ.");
        String hash=ChatSessions.hash(input.contactName().trim()+"\n"+input.contactEmail().trim()+"\n"+input.contactPhone().trim());
        if(d.getBookingId()!=null) {
            if(!hash.equals(d.getConfirmationHash()))throw conflict("Yêu cầu này đã tạo đơn với thông tin khác. Mở chi tiết đơn để kiểm tra.");
            var b=bookings.findById(d.getBookingId()).orElseThrow(ChatBookingService::missing);
            if(!Objects.equals(b.getUser().getId(),owner.id()))throw missing();
            return BookingResponseDto.from(b);
        }
        if(!d.getExpiresAt().isAfter(Instant.now()))throw conflict("Bản tóm tắt hết hạn. Vui lòng lấy giá mới và xác nhận lại.");
        var preview=schedules.findById(d.getScheduleId()).orElseThrow(ChatBookingService::missing);
        // Same tour -> schedule lock order as tour editing, then existing BookingService locks the schedule again.
        var tour=tours.findByIdForUpdate(preview.getTour().getId()).orElseThrow(ChatBookingService::missing);
        var s=schedules.findByIdForUpdate(d.getScheduleId()).orElseThrow(ChatBookingService::missing);
        emRefresh(tour,s);
        valid(s,d.getPeople());
        if(d.getUnitPrice().compareTo(tour.getPricePerPax())!=0 || !Objects.equals(d.getTourUpdatedAt(),tour.getUpdatedAt())
                || !Objects.equals(d.getDepartureDate(),s.getDepartureDate()) || !Objects.equals(d.getReturnDate(),s.getReturnDate())
                || !Objects.equals(d.getPickupAt(),s.getPickupAt()) || !Objects.equals(d.getPickupPoint(),s.getPickupPoint()))
            throw conflict("Giá hoặc thông tin chuyến đi đã thay đổi. Vui lòng lấy bản tóm tắt mới và xác nhận lại.");
        var request=new BookingRequestDto();request.setScheduleId(s.getId());request.setNumberOfPax(d.getPeople());
        request.setContactName(input.contactName().trim());request.setContactEmail(input.contactEmail().trim());request.setContactPhone(input.contactPhone().trim());
        var result=service.createBooking(email,request);d.setBookingId(result.id());d.setConfirmationHash(hash);drafts.saveAndFlush(d);
        return result;
    }
    private void emRefresh(Object tour,Object schedule) { em.refresh(tour);em.refresh(schedule); }
    private Quote quote(ChatBookingDraft d,TourSchedule s,AccountService.Profile owner) {
        return new Quote(d.getId(),s.getTour().getTitle(),d.getDepartureDate(),d.getReturnDate(),d.getPeople(),d.getUnitPrice(),
                d.getUnitPrice().multiply(BigDecimal.valueOf(d.getPeople())),d.getExpiresAt(),d.getPickupAt(),d.getPickupPoint(),
                s.getTour().getAdventureProfile()==null?null:s.getTour().getAdventureProfile().getParticipationRequirements(),
                owner.fullName(),owner.email(),owner.phone(),d.getBookingId());
    }
    private static boolean blank(String s) { return s==null || s.isBlank(); }
    private void valid(TourSchedule s,int people) {
        if(!Boolean.TRUE.equals(s.getTour().getIsActive()) || !"OPEN".equals(s.getStatus()) || s.getDepartureDate()==null
                || !s.getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))) || s.getAvailableSlots()==null
                || s.getAvailableSlots()<people || s.getTour().getPricePerPax()==null || s.getTour().getPricePerPax().signum()<0)
            throw conflict("Chuyến đi không còn nhận đặt chỗ, thiếu chỗ hoặc chưa có giá hợp lệ.");
    }
    private static void requireOwner(ChatBookingDraft d,Long user) { if(!Objects.equals(d.getUserId(),user))throw missing(); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy bản tóm tắt hoặc chuyến đi."); }
    private static ResponseStatusException conflict(String text) { return new ResponseStatusException(HttpStatus.CONFLICT,text); }
}
