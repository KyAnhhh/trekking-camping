package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Shared payment persistence; legacy class name retained for existing MoMo integration. */
@Service
public class MomoPaymentStore {
    private final com.trekkingcamping.backend.module.notification.service.NotificationService notifications;
    private static final Set<Integer> FINAL_FAILURES = Set.of(98, 99, 1001, 1002, 1003, 1004,
            1005, 1006, 1007, 1017, 1026, 2019, 4001, 4002, 4100);
    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final UserRepository users;
    private final TourScheduleRepository schedules;
    private final jakarta.persistence.EntityManager entityManager;

    public record Attempt(Long bookingId, String orderId, long amount, String orderInfo, String status) {}

    public MomoPaymentStore(BookingRepository bookings, PaymentTransactionRepository payments,
                            UserRepository users, TourScheduleRepository schedules, jakarta.persistence.EntityManager entityManager, com.trekkingcamping.backend.module.notification.service.NotificationService notifications) {
        this.notifications=notifications;
        this.bookings = bookings; this.payments = payments; this.users = users; this.schedules = schedules;
        this.entityManager = entityManager;
    }

    @Transactional
    public Attempt prepare(String email, Long bookingId) {
        return prepare(email, bookingId, "MOMO_SANDBOX");
    }

    @Transactional
    public Attempt prepare(String email, Long bookingId, String method) {
        requireMethod(method);
        User user = requireUser(email);
        Booking booking = bookings.findByIdForUpdate(bookingId).orElseThrow(this::notFound);
        entityManager.refresh(booking);
        authorize(booking, user, false);
        ParticipationGate.requirePayment(booking);
        if (!"PENDING".equals(booking.getStatus()) || !beforeDeparture(booking)) {
            throw conflict("Chỉ thanh toán đơn đang chờ và chưa đến ngày khởi hành.");
        }
        var schedule = schedules.findByIdForUpdate(booking.getSchedule().getId()).orElseThrow(this::notFound);
        entityManager.refresh(schedule);
        if (!Set.of("OPEN", "FULL").contains(schedule.getStatus()) || !Boolean.TRUE.equals(schedule.getTour().getIsActive())) {
            throw conflict("Lịch khởi hành không còn khả dụng.");
        }
        List<PaymentTransaction> history = payments.findByBookingIdOrderByIdDesc(bookingId);
        if (history.stream().anyMatch(p -> captured(p.getStatus()))) throw conflict("Đơn đã ghi nhận tiền thanh toán.");
        var pending = history.stream().filter(p -> "PENDING".equals(p.getStatus())).findFirst();
        if (pending.isPresent()) {
            if (!method.equals(pending.get().getPaymentMethod())) throw conflict("Đơn có giao dịch từ cổng thanh toán cũ đang chờ xử lý. Cần đối soát giao dịch đó trước khi đổi cổng thanh toán.");
            if (pending.get().getAmount().compareTo(booking.getTotalAmount()) != 0) throw conflict("Số tiền đơn không còn khớp giao dịch đang chờ.");
            return snapshot(pending.get());
        }
        long amount;
        try { amount = booking.getTotalAmount().longValueExact(); }
        catch (ArithmeticException | NullPointerException e) { throw conflict("Số tiền thanh toán không hợp lệ."); }
        if ("MOMO_SANDBOX".equals(method) && (amount < 1_000 || amount > 50_000_000)) throw conflict("MoMo sandbox hỗ trợ đơn từ 1.000 đến 50.000.000 đồng.");
        if ("VNPAY_SANDBOX".equals(method) && (amount < 5_000 || amount > 9_999_999_999L)) throw conflict("Số tiền VNPAY phải từ 5.000 đồng và không vượt quá giới hạn 12 chữ số sau khi nhân 100.");
        PaymentTransaction payment = new PaymentTransaction();
        payment.setBooking(booking);
        payment.setTransactionCode("VNPAY_SANDBOX".equals(method)
                ? "VN" + LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + UUID.randomUUID().toString().replace("-", "")
                : "MM-" + UUID.randomUUID());
        payment.setPaymentMethod(method);
        payment.setAmount(BigDecimal.valueOf(amount));
        payment.setStatus("PENDING");
        return snapshot(payments.save(payment));
    }

    @Transactional(readOnly = true)
    public Attempt getForUser(String email, String orderId) {
        return getForUser(email, orderId, "MOMO_SANDBOX");
    }

    @Transactional(readOnly = true)
    public Attempt getForUser(String email, String orderId, String method) {
        requireMethod(method);
        User user = requireUser(email);
        PaymentTransaction payment = payment(orderId, method);
        authorize(payment.getBooking(), user, true);
        return snapshot(payment);
    }

    @Transactional
    public Attempt applyResult(String orderId, long amount, int resultCode, String requestId, String orderInfo) {
        return applyResult(orderId, amount, resultCode, requestId, orderInfo, "MOMO_SANDBOX");
    }

    /** Only called after the gateway has verified the signed callback. */
    @Transactional
    public Attempt applyVnpayResult(String orderId, long amount, boolean success, boolean failed, String orderInfo) {
        return applyResult(orderId, amount, success ? 0 : failed ? 1006 : -1, null, orderInfo, "VNPAY_SANDBOX");
    }
    /** Only after querydr confirms an expired attempt has no recorded payment. */
    @Transactional
    public Attempt expireVnpay(String orderId, long amount, String orderInfo) {
        return applyResult(orderId, amount, -2, null, orderInfo, "VNPAY_SANDBOX");
    }

    private Attempt applyResult(String orderId, long amount, int resultCode, String requestId, String orderInfo, String method) {
        // This is a new, self-contained write transaction after any HTTP call. Discard OSIV's
        // earlier read-only snapshots so they cannot suppress dirty checking or overwrite an IPN.
        entityManager.clear();
        Long bookingId = payments.findBookingIdByTransactionCode(orderId).orElseThrow(this::notFound);
        Booking booking = bookings.findByIdForUpdate(bookingId).orElseThrow(this::notFound);
        // OSIV may retain entities read by getForUser before the external query. Reload under the lock.
        entityManager.refresh(booking);
        // All writes for one booking serialize on its row, including duplicate callbacks and cancellation.
        PaymentTransaction payment = payment(orderId, method);
        entityManager.refresh(payment);
        if (payment.getAmount().compareTo(BigDecimal.valueOf(amount)) != 0
                || booking.getTotalAmount().compareTo(payment.getAmount()) != 0
                || (requestId != null && !orderId.equals(requestId))
                || (orderInfo != null && !orderInfo.equals(orderInfo(booking, method)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin thanh toán không khớp với đơn.");
        }
        if (captured(payment.getStatus())) return snapshot(payment);
        // autoCapture=true: 9000 denotes successful authorization for this one-step flow.
        if (resultCode == 0 || resultCode == 9000) {
            boolean alreadyPaid = payments.findByBookingIdOrderByIdDesc(booking.getId()).stream()
                    .anyMatch(p -> !Objects.equals(p.getTransactionCode(), orderId) && captured(p.getStatus()));
            var schedule = schedules.findByIdForUpdate(booking.getSchedule().getId()).orElseThrow(this::notFound);
            entityManager.refresh(schedule);
            boolean fulfill = "PENDING".equals(booking.getStatus()) && beforeDeparture(booking) && !alreadyPaid
                    && ParticipationGate.ready(booking)
                    && Set.of("OPEN", "FULL").contains(schedule.getStatus())
                    && Boolean.TRUE.equals(schedule.getTour().getIsActive());
            payment.setStatus(fulfill ? "SUCCESS" : "REFUND_REQUIRED");
            payment.setPaidAt(LocalDateTime.now());
            if (fulfill) {
                booking.setStatus("CONFIRMED");
                notifications.booking(booking,"CONFIRMED","Thanh toán thành công, đơn đã xác nhận","Cổng thanh toán đã được đối soát. Kiểm tra lịch và chuẩn bị cho chuyến đi.");
                booking.setUpdatedAt(LocalDateTime.now());
                bookings.save(booking);
            }
        } else if (resultCode == -2 && "VNPAY_SANDBOX".equals(method) && "PENDING".equals(payment.getStatus())) {
            payment.setStatus("EXPIRED");
        } else if (FINAL_FAILURES.contains(resultCode)) {
            payment.setStatus("FAILED");
        }
        // Unknown/transient codes never release a possibly live payment for a second charge.
        payments.save(payment);
        if("REFUND_REQUIRED".equals(payment.getStatus())) {
            notifications.booking(booking,"PAYMENT:"+orderId+":REFUND_REQUIRED","Giao dịch cần xử lý hoàn tiền","Đã ghi nhận tiền nhưng chưa thể xác nhận đơn. Vui lòng liên hệ nhà tổ chức; đây chưa phải xác nhận đã hoàn tiền.");
            notifications.administrators(booking,"PAYMENT:"+orderId+":REFUND_REQUIRED","Giao dịch cần xử lý hoàn tiền");
        }
        if(Set.of("FAILED","EXPIRED").contains(payment.getStatus()))
            notifications.booking(booking,"PAYMENT:"+orderId+":"+payment.getStatus(),"Giao dịch chưa thanh toán thành công","Giao dịch đã được xác minh thất bại hoặc hết hạn. Mở chi tiết đơn để kiểm tra bước tiếp theo; chưa có xác nhận thanh toán thành công.");
        return snapshot(payment);
    }

    private PaymentTransaction payment(String orderId, String method) {
        PaymentTransaction payment = payments.findByTransactionCode(orderId).orElseThrow(this::notFound);
        if (!method.equals(payment.getPaymentMethod())) throw notFound();
        return payment;
    }
    private Attempt snapshot(PaymentTransaction payment) {
        return new Attempt(payment.getBooking().getId(), payment.getTransactionCode(),
                payment.getAmount().longValueExact(), orderInfo(payment.getBooking(), payment.getPaymentMethod()), payment.getStatus());
    }
    private String orderInfo(Booking booking, String method) {
        String info = "Thanh toan tour " + booking.getBookingCode();
        return "VNPAY_SANDBOX".equals(method) ? info.replaceAll("[^A-Za-z0-9 ]", " ") : info;
    }
    private void requireMethod(String method) {
        if (!Set.of("MOMO_SANDBOX", "VNPAY_SANDBOX").contains(method)) throw new IllegalArgumentException("Cổng thanh toán không hợp lệ.");
    }
    private boolean captured(String status) { return "SUCCESS".equals(status) || "REFUND_REQUIRED".equals(status); }
    private boolean beforeDeparture(Booking booking) {
        return booking.getSchedule().getDepartureDate() != null
                && booking.getSchedule().getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }
    private User requireUser(String email) {
        if (email == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        User user = users.findByEmail(email).orElseThrow(this::notFound);
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa.");
        return user;
    }
    private void authorize(Booking booking, User user, boolean allowAdmin) {
        boolean admin = allowAdmin && user.getRole() != null && "ROLE_ADMIN".equals(user.getRole().getName());
        if (!admin && !Objects.equals(booking.getUser().getId(), user.getId())) throw notFound();
    }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch hoặc đơn đặt tour."); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
