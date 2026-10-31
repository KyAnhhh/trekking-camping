package com.trekkingcamping.backend.module.admin;

import com.trekkingcamping.backend.module.admin.service.AdminOperationsService;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.service.*;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminOperationsTest {
    BookingRepository bookings=mock(BookingRepository.class);
    PaymentTransactionRepository payments=mock(PaymentTransactionRepository.class);
    TourReviewRepository reviews=mock(TourReviewRepository.class);
    UserRepository users=mock(UserRepository.class);
    VnpayPaymentService vnpay=mock(VnpayPaymentService.class);MomoPaymentService momo=mock(MomoPaymentService.class);
    VnpayGateway gateway=mock(VnpayGateway.class);
    MomoPaymentStore store=mock(MomoPaymentStore.class);
    AdminOperationsService service=new AdminOperationsService(bookings,payments,reviews,users,vnpay,momo,gateway,store);
    User admin=new User();
    @BeforeEach void setup() {
        var role=new Role();role.setName("ROLE_ADMIN");admin.setRole(role);admin.setIsActive(true);
        when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
    }
    @Test void inactiveAndNonAdminAccountsCannotReadOrReconcile() {
        admin.setIsActive(false);
        assertEquals(403,assertThrows(ResponseStatusException.class,()->service.overview("admin")).getStatusCode().value());
        admin.setIsActive(true);admin.getRole().setName("ROLE_USER");
        assertEquals(403,assertThrows(ResponseStatusException.class,()->service.reconcile("admin",1L,"127.0.0.1")).getStatusCode().value());
        verifyNoInteractions(bookings,payments,vnpay,momo);
    }
    @Test void totalsSeparateSuccessFromRefundAndExposeWorkQueues() {
        when(bookings.statusCounts()).thenReturn(Collections.singletonList(new Object[]{"CONFIRMED",3L}));
        when(bookings.countByStatusAndParticipationStatus("PENDING","REVIEW_REQUIRED")).thenReturn(2L);
        when(payments.countByStatus("PENDING")).thenReturn(4L);
        when(payments.countByStatus("REFUND_REQUIRED")).thenReturn(1L);
        when(payments.totalAmountByStatus("SUCCESS")).thenReturn(new BigDecimal("500000"));
        when(payments.totalAmountByStatus("REFUND_REQUIRED")).thenReturn(new BigDecimal("100000"));
        when(reviews.count()).thenReturn(7L);when(reviews.countByIsApprovedTrue()).thenReturn(5L);
        var result=service.overview("admin");assertEquals(2,result.awaitingReview());assertEquals(4,result.pendingPayments());
        assertEquals(new BigDecimal("500000"),result.successfulAmount());assertEquals(new BigDecimal("100000"),result.refundRequiredAmount());
        assertEquals(2,result.hiddenReviews());assertEquals(0,result.bookings().get("PENDING"));
    }
    @Test void reconcileUsesDatabaseProviderAndVerifiedServiceOnly() {
        var p=new PaymentTransaction();p.setId(1L);p.setStatus("PENDING");p.setPaymentMethod("VNPAY_SANDBOX");p.setTransactionCode("stored-order");
        when(payments.findById(1L)).thenReturn(Optional.of(p));
        when(vnpay.refresh("admin","stored-order","127.0.0.1")).thenReturn(new VnpayPaymentService.Checkout(4L,"stored-order","PENDING",null));
        assertEquals("PENDING",service.reconcile("admin",1L,"127.0.0.1").status());verifyNoInteractions(momo);verify(payments,never()).save(any());
        when(vnpay.refresh(any(),any(),any())).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY));
        assertThrows(ResponseStatusException.class,()->service.reconcile("admin",1L,"127.0.0.1"));assertEquals("PENDING",p.getStatus());
    }
    @Test void terminalOrUnsupportedPaymentsCannotBeManuallyMarkedPaid() {
        var p=new PaymentTransaction();p.setStatus("SUCCESS");when(payments.findById(1L)).thenReturn(Optional.of(p));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.reconcile("admin",1L,"local")).getStatusCode().value());
        p.setStatus("PENDING");p.setPaymentMethod("OTHER");
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.reconcile("admin",1L,"local")).getStatusCode().value());verifyNoInteractions(vnpay,momo);
    }
    @Test void hidePreservesRatingAndCommentAndRejectsStaleAction() {
        var r=new TourReview();r.setId(2L);r.setIsApproved(true);r.setRating(2);r.setComment("Phản hồi khách");
        var tour=new Tour();tour.setId(1L);tour.setTitle("Tour");r.setTour(tour);
        when(reviews.locked(2L)).thenReturn(Optional.of(r));
        var result=service.moderate("admin",2L,new AdminOperationsService.Moderation(true,false));
        assertFalse(result.approved());assertEquals(2,result.rating());assertEquals("Phản hồi khách",result.comment());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.moderate("admin",2L,new AdminOperationsService.Moderation(true,false))).getStatusCode().value());
        verify(reviews,times(1)).save(r);
    }
    @Test void filtersAndPaginationAreBoundedBeforeRepositoryReads() {
        assertThrows(IllegalArgumentException.class,()->service.payments("admin","INVALID",0));
        assertThrows(IllegalArgumentException.class,()->service.bookings("admin","ALL",-1));
        assertThrows(IllegalArgumentException.class,()->service.reviews("admin","ALL",10001));
        assertThrows(IllegalArgumentException.class,()->service.moderate("admin",1L,new AdminOperationsService.Moderation(null,true)));
        verifyNoInteractions(bookings,payments,reviews);
    }
    @Test void resolveManualUpdatesPendingPaymentViaStore() {
        MomoPaymentStore store = mock(MomoPaymentStore.class);
        AdminOperationsService s = new AdminOperationsService(bookings,payments,reviews,users,vnpay,momo,gateway,store);
        var p = new PaymentTransaction(); p.setId(2L); p.setStatus("PENDING"); p.setTransactionCode("tx-123");
        when(payments.findById(2L)).thenReturn(Optional.of(p));
        when(store.applyManualResolution("tx-123", "SUCCESS")).thenReturn(new MomoPaymentStore.Attempt(10L, "tx-123", 100000L, "info", "SUCCESS"));
        var result = s.resolve("admin", 2L, new AdminOperationsService.ResolveInput("SUCCESS"));
        assertEquals(2L, result.id());
        assertEquals(10L, result.bookingId());
        assertEquals("SUCCESS", result.status());

        p.setStatus("SUCCESS");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> s.resolve("admin", 2L, new AdminOperationsService.ResolveInput("SUCCESS"))).getStatusCode().value());
        p.setStatus("PENDING");
        assertThrows(IllegalArgumentException.class, () -> s.resolve("admin", 2L, new AdminOperationsService.ResolveInput("UNKNOWN")));
    }
}
