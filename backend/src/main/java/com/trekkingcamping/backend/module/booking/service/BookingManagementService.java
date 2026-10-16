package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.dto.*;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.entity.PaymentTransaction;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Objects;

@Service
public class BookingManagementService {
    private final com.trekkingcamping.backend.module.notification.service.NotificationService notifications;
    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final TourScheduleRepository schedules;
    private final UserRepository users;

    public BookingManagementService(BookingRepository bookings, PaymentTransactionRepository payments,
                                    TourScheduleRepository schedules, UserRepository users, com.trekkingcamping.backend.module.notification.service.NotificationService notifications) {
        this.notifications=notifications;
        this.bookings = bookings;
        this.payments = payments;
        this.schedules = schedules;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<BookingDetailDto> listForAdmin(String email) {
        requireAdmin(email);
        return bookings.findAllByOrderByCreatedAtDesc().stream().map(this::detail).toList();
    }

    @Transactional(readOnly = true)
    public BookingDetailDto getDetail(String email, Long id, boolean admin) {
        User user = admin ? requireAdmin(email) : requireUser(email);
        Booking booking = bookings.findById(id).orElseThrow(this::notFound);
        if (!admin) requireOwner(booking, user);
        return detail(booking);
    }

    @Transactional
    public BookingDetailDto cancel(String email, Long id, boolean admin) {
        User user = admin ? requireAdmin(email) : requireUser(email);
        Booking booking = bookings.findByIdForUpdate(id).orElseThrow(this::notFound);
        if (!admin) requireOwner(booking, user);
        if ("CANCELLED".equals(booking.getStatus())) return detail(booking);
        if (!List.of("PENDING", "CONFIRMED").contains(booking.getStatus())) {
            throw conflict("Đơn không còn ở trạng thái có thể hủy.");
        }
        if (!beforeDeparture(booking)) throw conflict("Không thể hủy đơn từ ngày khởi hành.");
        List<PaymentTransaction> transactions = payments.findByBookingIdOrderByIdDesc(id);
        if (hasCapturedPayment(transactions)) {
            throw conflict("Đơn đã thanh toán. Vui lòng liên hệ quản trị viên xử lý hoàn tiền trước khi hủy.");
        }
        if (transactions.stream().anyMatch(payment -> "PENDING".equals(payment.getStatus()))) {
            throw conflict("Đơn đang chờ đối soát thanh toán. Cần xử lý giao dịch trước khi hủy.");
        }
        TourSchedule schedule = schedules.findByIdForUpdate(booking.getSchedule().getId())
                .orElseThrow(() -> conflict("Không tìm thấy lịch khởi hành để hoàn chỗ."));
        if (schedule.getAvailableSlots() == null || booking.getNumberOfPax() == null) {
            throw conflict("Dữ liệu số chỗ không hợp lệ.");
        }
        schedule.setAvailableSlots(Math.addExact(schedule.getAvailableSlots(), booking.getNumberOfPax()));
        if ("FULL".equals(schedule.getStatus())) schedule.setStatus("OPEN");
        schedules.save(schedule);
        booking.setStatus("CANCELLED");
        notifications.booking(booking,"CANCELLED","Đơn đặt tour đã hủy","Xem chi tiết trạng thái đơn trong tài khoản.");
        booking.setUpdatedAt(LocalDateTime.now());
        bookings.save(booking);
        return detail(booking);
    }

    @Transactional
    public BookingDetailDto confirm(String email, Long id) {
        requireAdmin(email);
        Booking booking = bookings.findByIdForUpdate(id).orElseThrow(this::notFound);
        if ("CONFIRMED".equals(booking.getStatus())) return detail(booking);
        if (!"PENDING".equals(booking.getStatus())) throw conflict("Chỉ xác nhận đơn đang chờ.");
        if (!ParticipationGate.ready(booking)) throw conflict("Chưa hoàn tất xem xét yêu cầu tham gia.");
        if (!beforeDeparture(booking)) throw conflict("Lịch khởi hành đã đến hạn.");
        if (!fullyPaid(booking, payments.findByBookingIdOrderByIdDesc(id))) {
            throw conflict("Đơn chưa được đối soát đủ tiền thanh toán.");
        }
        TourSchedule schedule = schedules.findByIdForUpdate(booking.getSchedule().getId())
                .orElseThrow(() -> conflict("Lịch khởi hành không tồn tại."));
        if (!List.of("OPEN", "FULL").contains(schedule.getStatus())
                || !Boolean.TRUE.equals(schedule.getTour().getIsActive())) {
            throw conflict("Lịch khởi hành không còn khả dụng.");
        }
        booking.setStatus("CONFIRMED");
        notifications.booking(booking,"CONFIRMED","Đơn đặt tour đã xác nhận","Vui lòng kiểm tra lịch khởi hành và chuẩn bị trang bị.");
        booking.setUpdatedAt(LocalDateTime.now());
        bookings.save(booking);
        return detail(booking);
    }

    @Transactional
    public BookingDetailDto complete(String email, Long id) {
        requireAdmin(email);
        Booking booking = bookings.findByIdForUpdate(id).orElseThrow(this::notFound);
        if ("COMPLETED".equals(booking.getStatus())) return detail(booking);
        if (!"CONFIRMED".equals(booking.getStatus()) || booking.getSchedule().getReturnDate() == null
                || !booking.getSchedule().getReturnDate().isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                || !fullyPaid(booking, payments.findByBookingIdOrderByIdDesc(id))) {
            throw conflict("Chỉ hoàn thành đơn đã xác nhận, đủ tiền và đã qua ngày kết thúc tour.");
        }
        booking.setStatus("COMPLETED");
        notifications.booking(booking,"COMPLETED","Chuyến đi đã hoàn thành","Cảm ơn bạn đã đồng hành. Bạn có thể gửi đánh giá trong chi tiết đơn.");
        booking.setUpdatedAt(LocalDateTime.now());
        bookings.save(booking);
        return detail(booking);
    }

    private BookingDetailDto detail(Booking booking) {
        List<PaymentTransaction> transactions = payments.findByBookingIdOrderByIdDesc(booking.getId());
        boolean active = List.of("PENDING", "CONFIRMED").contains(booking.getStatus()) && beforeDeparture(booking);
        boolean pendingPayment = transactions.stream().anyMatch(p -> "PENDING".equals(p.getStatus()));
        boolean scheduleAvailable = List.of("OPEN", "FULL").contains(booking.getSchedule().getStatus())
                && Boolean.TRUE.equals(booking.getSchedule().getTour().getIsActive());
        return new BookingDetailDto(BookingResponseDto.from(booking), booking.getContactName(),
                booking.getContactEmail(), booking.getContactPhone(),
                transactions.stream().map(PaymentResponseDto::from).toList(),
                active && !pendingPayment && !hasCapturedPayment(transactions),
                "PENDING".equals(booking.getStatus()) && beforeDeparture(booking)
                        && scheduleAvailable && ParticipationGate.ready(booking) && fullyPaid(booking, transactions),
                booking.getParticipationStatus(), booking.getParticipationDeadline());
    }

    private boolean fullyPaid(Booking booking, List<PaymentTransaction> transactions) {
        return booking.getTotalAmount() != null && booking.getTotalAmount().signum() >= 0
                && paidAmount(transactions).compareTo(booking.getTotalAmount()) >= 0;
    }

    private BigDecimal paidAmount(List<PaymentTransaction> transactions) {
        return transactions.stream().filter(p -> "SUCCESS".equals(p.getStatus()))
                .map(PaymentTransaction::getAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean hasCapturedPayment(List<PaymentTransaction> transactions) {
        return transactions.stream().anyMatch(p -> "SUCCESS".equals(p.getStatus()) || "REFUND_REQUIRED".equals(p.getStatus()));
    }

    private boolean beforeDeparture(Booking booking) {
        LocalDate departure = booking.getSchedule().getDepartureDate();
        return departure != null && departure.isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        User user = users.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại."));
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa.");
        return user;
    }

    private User requireAdmin(String email) {
        User user = requireUser(email);
        if (user.getRole() == null || !"ROLE_ADMIN".equals(user.getRole().getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quản trị viên được thực hiện thao tác này.");
        }
        return user;
    }

    private void requireOwner(Booking booking, User user) {
        if (booking.getUser() == null || !Objects.equals(booking.getUser().getId(), user.getId())) throw notFound();
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt tour.");
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
