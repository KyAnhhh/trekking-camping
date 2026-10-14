package com.trekkingcamping.backend.module.review.service;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.PageRequest;
import java.time.*;
import java.util.*;
@Service
public class ReviewService {
    public record Input(Integer rating, String comment) {}
    public record Item(Long id, String author, Integer rating, String comment, LocalDateTime createdAt, boolean verified) {}
    public record Summary(double average, long total, List<Item> items, int page) {}
    public record Eligibility(boolean canReview, Item review, String message) {}
    private final TourReviewRepository reviews; private final BookingRepository bookings;
    private final TourRepository tours; private final EntityManager em;
    public ReviewService(TourReviewRepository reviews, BookingRepository bookings, TourRepository tours, EntityManager em) {
        this.reviews=reviews; this.bookings=bookings; this.tours=tours; this.em=em;
    }
    @Transactional(readOnly=true) public Summary list(Long tourId, int page) {
        if (page < 0 || page > 10000) throw new IllegalArgumentException("Trang không hợp lệ.");
        tours.findById(tourId).filter(t -> Boolean.TRUE.equals(t.getIsActive())).orElseThrow(this::notFound);
        Double avg=reviews.average(tourId);
        return new Summary(avg == null ? 0 : Math.round(avg*10)/10.0, reviews.countByTourIdAndIsApprovedTrue(tourId),
                reviews.findByTourIdAndIsApprovedTrueOrderByCreatedAtDesc(tourId,PageRequest.of(page,20)).stream().map(this::item).toList(),page);
    }
    @Transactional(readOnly=true) public Eligibility eligibility(String email, Long bookingId) {
        Booking booking=bookings.findById(bookingId).orElseThrow(this::notFound); owner(booking,email);
        var review=reviews.findByBookingId(bookingId).orElse(null);
        return new Eligibility(review==null && completed(booking), review==null ? null : item(review),
                review!=null ? "Bạn đã đánh giá chuyến đi này." : completed(booking) ? "Chia sẻ trải nghiệm sau chuyến đi." : "Đánh giá mở khi chuyến đi kết thúc và đơn được xác nhận hoàn thành.");
    }
    @Transactional public Item create(String email, Long bookingId, Input input) {
        if (input==null || input.rating()==null || input.rating()<1 || input.rating()>5 || input.comment()==null
                || input.comment().isBlank() || input.comment().length()>2000)
            throw new IllegalArgumentException("Chọn từ 1–5 sao và nhập nhận xét từ 1–2.000 ký tự.");
        Booking booking=bookings.findByIdForUpdate(bookingId).orElseThrow(this::notFound); em.refresh(booking); owner(booking,email);
        if (!completed(booking)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Chỉ đánh giá đơn đã hoàn thành sau ngày kết thúc tour.");
        if (reviews.findByBookingId(bookingId).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Mỗi đơn chỉ được đánh giá một lần.");
        var review=new TourReview(); review.setBooking(booking); review.setTour(booking.getSchedule().getTour()); review.setUser(booking.getUser());
        review.setRating(input.rating()); review.setComment(input.comment().trim()); review.setIsVerifiedBuyer(true); review.setIsApproved(true);
        return item(reviews.save(review));
    }
    private boolean completed(Booking b) {
        return "COMPLETED".equals(b.getStatus()) && b.getSchedule().getReturnDate()!=null
                && b.getSchedule().getReturnDate().isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }
    private void owner(Booking b,String email) {
        if(email==null || b.getUser()==null || !email.equals(b.getUser().getEmail())) throw notFound();
    }
    private Item item(TourReview r) {
        String name=r.getUser().getFullName();
        return new Item(r.getId(),name==null || name.isBlank() ? "Khách du lịch" : name,r.getRating(),r.getComment(),r.getCreatedAt(),Boolean.TRUE.equals(r.getIsVerifiedBuyer()));
    }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy dữ liệu."); }
}
