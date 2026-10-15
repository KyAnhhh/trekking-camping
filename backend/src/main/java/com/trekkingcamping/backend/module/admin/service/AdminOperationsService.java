package com.trekkingcamping.backend.module.admin.service;

import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.service.*;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AdminOperationsService {
    public record Overview(Map<String,Long> bookings,long awaitingReview,long pendingPayments,long refundRequired,
            BigDecimal successfulAmount,BigDecimal refundRequiredAmount,long visibleReviews,long hiddenReviews) {}
    public record PageResult<T>(List<T> items,int page,int totalPages,long totalElements) {
        public static <T> PageResult<T> of(Page<T> p) { return new PageResult<>(p.getContent(),p.getNumber(),p.getTotalPages(),p.getTotalElements()); }
    }
    public record BookingRow(Long id,String code,String tour,String contactName,String status,String participationStatus,
            LocalDate departureDate,Integer people,BigDecimal amount,LocalDateTime deadline) {}
    public record PaymentRow(Long id,Long bookingId,String bookingCode,String orderId,String method,String status,
            BigDecimal amount,LocalDateTime paidAt,Boolean checkoutExpired,boolean canReconcile) {}
    public record ReviewRow(Long id,Long bookingId,Long tourId,String tour,String author,Integer rating,String comment,
            boolean approved,LocalDateTime createdAt) {}
    public record Moderation(Boolean expectedApproved,Boolean approved) {}
    public record Reconciliation(Long id,Long bookingId,String status) {}
    private final BookingRepository bookings;private final PaymentTransactionRepository payments;
    private final TourReviewRepository reviews;private final UserRepository users;
    private final VnpayPaymentService vnpay;private final MomoPaymentService momo;private final VnpayGateway gateway;
    public AdminOperationsService(BookingRepository bookings,PaymentTransactionRepository payments,TourReviewRepository reviews,
            UserRepository users,VnpayPaymentService vnpay,MomoPaymentService momo,VnpayGateway gateway) {
        this.bookings=bookings;this.payments=payments;this.reviews=reviews;this.users=users;
        this.vnpay=vnpay;this.momo=momo;this.gateway=gateway;
    }
    @Transactional(readOnly=true)
    public Overview overview(String email) {
        admin(email);Map<String,Long> counts=new LinkedHashMap<>();
        for(String state:List.of("PENDING","CONFIRMED","COMPLETED","CANCELLED"))counts.put(state,0L);
        for(Object[] row:bookings.statusCounts())counts.put(Objects.toString(row[0],"UNKNOWN"),((Number)row[1]).longValue());
        long visible=reviews.countByIsApprovedTrue();
        return new Overview(counts,bookings.countByStatusAndParticipationStatus("PENDING","REVIEW_REQUIRED"),
                payments.countByStatus("PENDING"),payments.countByStatus("REFUND_REQUIRED"),
                payments.totalAmountByStatus("SUCCESS"),payments.totalAmountByStatus("REFUND_REQUIRED"),visible,reviews.count()-visible);
    }
    @Transactional(readOnly=true)
    public PageResult<BookingRow> bookings(String email,String queue,int page) {
        admin(email);allowed(queue,Set.of("ALL","PENDING","REVIEW_REQUIRED","CONFIRMED","COMPLETED","CANCELLED"));
        Specification<Booking> spec=(root,q,cb)->"ALL".equals(queue)?cb.conjunction():"REVIEW_REQUIRED".equals(queue)?
                cb.and(cb.equal(root.get("status"),"PENDING"),cb.equal(root.get("participationStatus"),queue)):cb.equal(root.get("status"),queue);
        return PageResult.of(bookings.findAll(spec,page(page)).map(b->new BookingRow(b.getId(),b.getBookingCode(),b.getSchedule().getTour().getTitle(),
                b.getContactName(),b.getStatus(),b.getParticipationStatus(),b.getSchedule().getDepartureDate(),b.getNumberOfPax(),b.getTotalAmount(),b.getParticipationDeadline())));
    }
    @Transactional(readOnly=true)
    public PageResult<PaymentRow> payments(String email,String status,int page) {
        admin(email);allowed(status,Set.of("ALL","PENDING","SUCCESS","FAILED","EXPIRED","REFUND_REQUIRED"));
        Specification<PaymentTransaction> spec=(root,q,cb)->"ALL".equals(status)?cb.conjunction():cb.equal(root.get("status"),status);
        return PageResult.of(payments.findAll(spec,page(page)).map(p->{
            Boolean expired=null;
            if("VNPAY_SANDBOX".equals(p.getPaymentMethod()) && "PENDING".equals(p.getStatus()))try { expired=gateway.expired(p.getTransactionCode()); }catch(RuntimeException ignored) {}
            return new PaymentRow(p.getId(),p.getBooking().getId(),p.getBooking().getBookingCode(),p.getTransactionCode(),p.getPaymentMethod(),p.getStatus(),
                    p.getAmount(),p.getPaidAt(),expired,"PENDING".equals(p.getStatus()) && Set.of("VNPAY_SANDBOX","MOMO_SANDBOX").contains(Objects.toString(p.getPaymentMethod(),"")));
        }));
    }
    // External query runs outside a DB transaction. Existing stores verify results and lock rows when applying them.
    public Reconciliation reconcile(String email,Long id,String ip) {
        admin(email);var p=payments.findById(id).orElseThrow(AdminOperationsService::missing);
        if(!"PENDING".equals(p.getStatus()))throw conflict("Giao dịch không còn chờ đối soát. Hãy tải lại danh sách.");
        if("VNPAY_SANDBOX".equals(p.getPaymentMethod())) { var r=vnpay.refresh(email,p.getTransactionCode(),ip);return new Reconciliation(id,r.bookingId(),r.status()); }
        if("MOMO_SANDBOX".equals(p.getPaymentMethod())) { var r=momo.refresh(email,p.getTransactionCode());return new Reconciliation(id,r.bookingId(),r.status()); }
        throw conflict("Phương thức này chưa hỗ trợ đối soát tự động.");
    }
    @Transactional(readOnly=true)
    public PageResult<ReviewRow> reviews(String email,String visibility,int page) {
        admin(email);allowed(visibility,Set.of("ALL","VISIBLE","HIDDEN"));
        Specification<TourReview> spec=(root,q,cb)->"ALL".equals(visibility)?cb.conjunction():
                cb.equal(cb.coalesce(root.<Boolean>get("isApproved"),false),"VISIBLE".equals(visibility));
        return PageResult.of(reviews.findAll(spec,page(page)).map(this::review));
    }
    @Transactional
    public ReviewRow moderate(String email,Long id,Moderation input) {
        admin(email);if(input==null || input.approved()==null || input.expectedApproved()==null)throw new IllegalArgumentException("Thiếu trạng thái đánh giá.");
        var r=reviews.locked(id).orElseThrow(AdminOperationsService::missing);
        if(Boolean.TRUE.equals(r.getIsApproved())!=input.expectedApproved())throw conflict("Đánh giá đã thay đổi. Tải lại trước khi xử lý.");
        r.setIsApproved(input.approved());reviews.save(r);return review(r);
    }
    private ReviewRow review(TourReview r) {
        return new ReviewRow(r.getId(),r.getBooking()==null?null:r.getBooking().getId(),r.getTour().getId(),r.getTour().getTitle(),
                r.getUser()==null?"Khách du lịch":Objects.toString(r.getUser().getFullName(),"Khách du lịch"),r.getRating(),r.getComment(),Boolean.TRUE.equals(r.getIsApproved()),r.getCreatedAt());
    }
    private void admin(String email) {
        if(email==null || email.isBlank())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Vui lòng đăng nhập.");
        var user=users.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản."));
        if(!Boolean.TRUE.equals(user.getIsActive()) || user.getRole()==null || !"ROLE_ADMIN".equals(user.getRole().getName()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Chỉ quản trị viên được thực hiện thao tác này.");
    }
    private static PageRequest page(int page) { if(page<0 || page>10000)throw new IllegalArgumentException("Trang không hợp lệ.");return PageRequest.of(page,20,Sort.by(Sort.Direction.DESC,"id")); }
    private static void allowed(String value,Set<String> values) { if(value==null || !values.contains(value))throw new IllegalArgumentException("Bộ lọc không hợp lệ."); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy dữ liệu."); }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT,message); }
}
