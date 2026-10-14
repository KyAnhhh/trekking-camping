package com.trekkingcamping.backend.module.booking;

import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.service.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingLifecycleTest {
    BookingRepository bookings = mock(BookingRepository.class);
    PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    UserRepository users = mock(UserRepository.class);
    TourScheduleRepository schedules = mock(TourScheduleRepository.class);
    jakarta.persistence.EntityManager entityManager = mock(jakarta.persistence.EntityManager.class);
    MomoPaymentStore store = new MomoPaymentStore(bookings, payments, users, schedules, entityManager);
    BookingManagementService management = new BookingManagementService(bookings, payments, schedules, users);
    Booking booking;
    User user;
    TourSchedule schedule;
    List<PaymentTransaction> history;

    @BeforeEach void setup() {
        user = new User(); user.setId(7L); user.setEmail("test@example.test"); user.setIsActive(true);
        Role role = new Role(); role.setName("ROLE_USER"); user.setRole(role);
        Tour tour = new Tour(); tour.setIsActive(true); tour.setTitle("Test tour"); tour.setSlug("test-tour");
        schedule = new TourSchedule(); schedule.setId(2L); schedule.setTour(tour);
        schedule.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(5));
        schedule.setReturnDate(schedule.getDepartureDate().plusDays(2));
        schedule.setStatus("FULL"); schedule.setAvailableSlots(0);
        booking = new Booking(); booking.setId(1L); booking.setBookingCode("BK-TEST"); booking.setUser(user);
        booking.setSchedule(schedule); booking.setNumberOfPax(2); booking.setStatus("PENDING");
        booking.setTotalAmount(new BigDecimal("2000000"));
        history = new ArrayList<>();
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(schedules.findByIdForUpdate(2L)).thenReturn(Optional.of(schedule));
        when(payments.findByBookingIdOrderByIdDesc(1L)).thenAnswer(inv -> new ArrayList<>(history));
        when(payments.save(any())).thenAnswer(inv -> {
            PaymentTransaction p = inv.getArgument(0);
            if (!history.contains(p)) history.add(p);
            when(payments.findByTransactionCode(p.getTransactionCode())).thenReturn(Optional.of(p));
            when(payments.findBookingIdByTransactionCode(p.getTransactionCode())).thenReturn(Optional.of(1L));
            return p;
        });
    }

    @Test void repeatedCheckoutReusesPendingAttemptAndServerAmount() {
        var first = store.prepare(user.getEmail(), 1L);
        var second = store.prepare(user.getEmail(), 1L);
        assertEquals(first.orderId(), second.orderId()); assertEquals(2000000L, first.amount());
        assertEquals(1, history.size()); assertEquals(0, schedule.getAvailableSlots());
    }

    @Test void anotherUserCannotReadPayOrCancelBooking() {
        User stranger = new User(); stranger.setId(99L); stranger.setIsActive(true);
        when(users.findByEmail("stranger@example.test")).thenReturn(Optional.of(stranger));
        var attempt = store.prepare(user.getEmail(), 1L);
        assertStatus(404, () -> store.prepare("stranger@example.test", 1L));
        assertStatus(404, () -> store.getForUser("stranger@example.test", attempt.orderId()));
        assertStatus(404, () -> management.getDetail("stranger@example.test", 1L, false));
        assertStatus(404, () -> management.cancel("stranger@example.test", 1L, false));
    }

    @Test void successConfirmsExactlyOnceAndDoesNotSubtractSeatsAgain() {
        var p = store.prepare(user.getEmail(), 1L);
        store.applyResult(p.orderId(), p.amount(), 0, p.orderId(), p.orderInfo());
        store.applyResult(p.orderId(), p.amount(), 0, p.orderId(), p.orderInfo());
        store.applyResult(p.orderId(), p.amount(), 1006, p.orderId(), p.orderInfo());
        assertEquals("SUCCESS", history.getFirst().getStatus());
        assertEquals("CONFIRMED", booking.getStatus()); assertEquals(0, schedule.getAvailableSlots());
        verify(bookings, times(1)).save(booking);
        assertStatus(409, () -> management.cancel(user.getEmail(), 1L, false));
    }

    @Test void validatesAmountAndReferenceBeforeUpdating() {
        var p = store.prepare(user.getEmail(), 1L);
        assertStatus(400, () -> store.applyResult(p.orderId(), 1, 0, p.orderId(), p.orderInfo()));
        assertStatus(400, () -> store.applyResult(p.orderId(), p.amount(), 0, "forged", p.orderInfo()));
        assertStatus(400, () -> store.applyResult(p.orderId(), p.amount(), 0, p.orderId(), "wrong"));
        assertEquals("PENDING", booking.getStatus()); assertNull(history.getFirst().getPaidAt());
    }

    @Test void refreshReloadsPreviouslyReadStateUnderBookingLockBeforeProcessing() {
        var p = store.prepare(user.getEmail(), 1L);
        clearInvocations(bookings, payments, entityManager);
        store.applyResult(p.orderId(), p.amount(), 0, null, null);
        var order = inOrder(bookings, payments, entityManager);
        order.verify(entityManager).clear();
        order.verify(bookings).findByIdForUpdate(1L);
        order.verify(entityManager).refresh(booking);
        order.verify(payments).findByTransactionCode(p.orderId());
        order.verify(entityManager).refresh(history.getFirst());
    }

    @ParameterizedTest @ValueSource(ints = {10, 13, 40, 41, 42, 1000, 7000, 7002, 99999})
    void uncertainResultKeepsAttemptPendingAndBlocksCancellation(int code) {
        var p = store.prepare(user.getEmail(), 1L);
        assertEquals("PENDING", store.applyResult(p.orderId(), p.amount(), code, null, null).status());
        assertStatus(409, () -> management.cancel(user.getEmail(), 1L, false));
    }

    @Test void failedPaymentCanBeRetriedWithANewOrderId() {
        var first = store.prepare(user.getEmail(), 1L);
        store.applyResult(first.orderId(), first.amount(), 1006, null, null);
        assertNotEquals(first.orderId(), store.prepare(user.getEmail(), 1L).orderId());
    }

    @Test void cancellationReturnsSeatsOnceAndLateSuccessRequiresRefund() {
        var p = store.prepare(user.getEmail(), 1L);
        store.applyResult(p.orderId(), p.amount(), 1006, null, null);
        management.cancel(user.getEmail(), 1L, false);
        management.cancel(user.getEmail(), 1L, false);
        assertEquals(2, schedule.getAvailableSlots()); assertEquals("OPEN", schedule.getStatus());
        assertEquals("REFUND_REQUIRED", store.applyResult(p.orderId(), p.amount(), 0, null, null).status());
        assertEquals("CANCELLED", booking.getStatus()); assertEquals(2, schedule.getAvailableSlots());
        verify(schedules, times(1)).save(schedule);
    }

    @Test void cancellationDoesNotReopenClosedSchedule() {
        schedule.setStatus("CLOSED");
        management.cancel(user.getEmail(), 1L, false);
        assertEquals("CLOSED", schedule.getStatus()); assertEquals(2, schedule.getAvailableSlots());
    }

    @Test void lateSecondSuccessDoesNotDoubleConfirmBooking() {
        var first = store.prepare(user.getEmail(), 1L);
        store.applyResult(first.orderId(), first.amount(), 1006, null, null);
        var second = store.prepare(user.getEmail(), 1L);
        store.applyResult(second.orderId(), second.amount(), 0, null, null);
        assertEquals("REFUND_REQUIRED", store.applyResult(first.orderId(), first.amount(), 0, null, null).status());
        verify(bookings, times(1)).save(booking);
    }

    @Test void reconciledExpiredVnpayCanRetryAndLateSuccessRequiresRefund() {
        var first = store.prepare(user.getEmail(), 1L, "VNPAY_SANDBOX");
        assertEquals("EXPIRED", store.expireVnpay(first.orderId(), first.amount(), first.orderInfo()).status());
        assertEquals("PENDING", booking.getStatus());
        var second = store.prepare(user.getEmail(), 1L, "VNPAY_SANDBOX");
        assertNotEquals(first.orderId(), second.orderId());
        assertEquals(second.orderId(), store.prepare(user.getEmail(), 1L, "VNPAY_SANDBOX").orderId());
        store.applyVnpayResult(second.orderId(), second.amount(), true, false, second.orderInfo());
        assertEquals("REFUND_REQUIRED", store.applyVnpayResult(first.orderId(), first.amount(), true, false, first.orderInfo()).status());
        assertEquals("CONFIRMED", booking.getStatus());
        assertEquals(0, schedule.getAvailableSlots());
        verify(bookings, times(1)).save(booking);
    }

    @Test void staleExpiryResultCannotOverwriteCapturedVnpayPayment() {
        var attempt = store.prepare(user.getEmail(), 1L, "VNPAY_SANDBOX");
        store.applyVnpayResult(attempt.orderId(), attempt.amount(), true, false, attempt.orderInfo());
        assertEquals("SUCCESS", store.expireVnpay(attempt.orderId(), attempt.amount(), attempt.orderInfo()).status());
        assertEquals("CONFIRMED", booking.getStatus());
        assertStatus(409, () -> store.prepare(user.getEmail(), 1L, "VNPAY_SANDBOX"));
    }

    @Test void onlyAdminCanConfirmAndOnlyAfterPayment() {
        assertStatus(403, () -> management.confirm(user.getEmail(), 1L));
        user.getRole().setName("ROLE_ADMIN");
        assertStatus(409, () -> management.confirm(user.getEmail(), 1L));
        booking.setTotalAmount(BigDecimal.ZERO);
        assertEquals("CONFIRMED", management.confirm(user.getEmail(), 1L).booking().status());
    }

    @Test void rejectsDepartureDayAndUnavailableSchedule() {
        schedule.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        assertStatus(409, () -> store.prepare(user.getEmail(), 1L));
        assertStatus(409, () -> management.cancel(user.getEmail(), 1L, false));
        schedule.setDepartureDate(LocalDate.now().plusDays(10)); schedule.setStatus("CANCELLED");
        assertStatus(409, () -> store.prepare(user.getEmail(), 1L));
    }

    private void assertStatus(int code, org.junit.jupiter.api.function.Executable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action).getStatusCode().value());
    }
    @Test void newParticipationGateBlocksPaymentAndManualConfirmation() {
        booking.setParticipationStatus("REVIEW_REQUIRED");
        assertStatus(409,()->store.prepare(user.getEmail(),1L,"VNPAY_SANDBOX"));
        assertTrue(history.isEmpty()); user.getRole().setName("ROLE_ADMIN");
        assertStatus(409,()->management.confirm(user.getEmail(),1L));
        booking.setParticipationStatus("READY");
        assertEquals("PENDING",store.prepare(user.getEmail(),1L,"VNPAY_SANDBOX").status());
    }
    @Test void lateSuccessAfterParticipationInvalidationRequiresReconciliation() {
        booking.setParticipationStatus("READY");
        var attempt=store.prepare(user.getEmail(),1L,"VNPAY_SANDBOX");
        booking.setParticipationStatus("NEEDS_CONTACT");
        assertEquals("REFUND_REQUIRED",store.applyVnpayResult(attempt.orderId(),attempt.amount(),true,false,attempt.orderInfo()).status());
        assertEquals("PENDING",booking.getStatus());
    }
    @Test void expiredNewHoldCannotCreateAnotherPayment() {
        booking.setParticipationStatus("READY"); booking.setParticipationDeadline(LocalDateTime.now().minusMinutes(1));
        assertStatus(409,()->store.prepare(user.getEmail(),1L,"VNPAY_SANDBOX")); assertTrue(history.isEmpty());
    }
}
