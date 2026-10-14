package com.trekkingcamping.backend.module.booking.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ParticipationTest {
    final BookingRepository bookings=mock(BookingRepository.class);
    final PaymentTransactionRepository payments=mock(PaymentTransactionRepository.class);
    final ParticipationRepository declarations=mock(ParticipationRepository.class);
    final ParticipationAuditRepository audits=mock(ParticipationAuditRepository.class);
    final UserRepository users=mock(UserRepository.class);
    final EntityManager em=mock(EntityManager.class);
    final TourScheduleRepository schedules=mock(TourScheduleRepository.class);
    final ObjectMapper json=new ObjectMapper();
    final HealthCipher cipher=new HealthCipher(Base64.getEncoder().encodeToString(randomKey()));
    final ParticipationService service=new ParticipationService(bookings,payments,declarations,audits,users,em,json,cipher);
    final ParticipationMaintenance maintenance=new ParticipationMaintenance(bookings,payments,schedules,declarations,audits,em);
    Booking b; User owner; ParticipationDeclaration stored;
    static byte[] randomKey(){byte[] key=new byte[32];new java.security.SecureRandom().nextBytes(key);return key;}
    @BeforeEach void setup() {
        owner=new User();owner.setId(1L);owner.setEmail("owner@example.test");owner.setRole(new Role(1,"ROLE_USER"));
        var admin=new User();admin.setId(2L);admin.setRole(new Role(2,"ROLE_ADMIN"));
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
        var t=new Tour();t.setTitle("Test only");t.setDurationDays(2);t.setDifficultyLevel(1);
        var s=new TourSchedule();s.setId(2L);s.setTour(t);s.setDepartureDate(LocalDate.now().plusDays(10));s.setReturnDate(LocalDate.now().plusDays(11));s.setAvailableSlots(3);s.setStatus("OPEN");
        b=Booking.builder().id(1L).user(owner).schedule(s).numberOfPax(1).status("PENDING").participationStatus("INCOMPLETE").participationRevision(0L).participationDeadline(LocalDateTime.now().plusDays(2)).build();
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(b));when(schedules.findByIdForUpdate(2L)).thenReturn(Optional.of(s));
        when(declarations.findById(1L)).thenAnswer(i->Optional.ofNullable(stored));
        when(declarations.save(any())).thenAnswer(i->{stored=i.getArgument(0);return stored;});
    }
    ParticipationService.Submission input(long revision) {
        return new ParticipationService.Submission(revision,List.of(new ParticipationService.Person("Test traveller","PRIVATE","private-test-note","Test contact","0900000000",true)));
    }
    @Test void encryptsPerPersonSubmissionAndRequiresAdminReview() {
        var submitted=service.submit(owner.getEmail(),1L,input(0));
        assertEquals("REVIEW_REQUIRED",submitted.status());assertFalse(stored.getEncryptedContent().contains("private-test-note"));
        assertEquals("private-test-note",service.get(owner.getEmail(),1L,false).declaration().people().getFirst().notes());
        assertThrows(ResponseStatusException.class,()->service.review(owner.getEmail(),1L,new ParticipationService.Review(1L,"READY")));
        var reviewed=service.review("admin",1L,new ParticipationService.Review(1L,"READY"));assertEquals("READY",reviewed.status());
        assertEquals(2,reviewed.revision());verify(audits,atLeast(3)).save(any());
    }
    @Test void wrongOwnerCannotReadOrWriteEvenKnowingBookingId() {
        var stranger=new User();stranger.setId(99L);when(users.findByEmail("stranger")).thenReturn(Optional.of(stranger));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.get("stranger",1L,false)).getStatusCode().value());
        assertThrows(ResponseStatusException.class,()->service.submit("stranger",1L,input(0)));
        verifyNoInteractions(declarations);
    }
    @Test void cannotApproveStaleVersionOrIncompleteGroup() {
        b.setNumberOfPax(2);assertThrows(IllegalArgumentException.class,()->service.submit(owner.getEmail(),1L,input(0)));
        b.setNumberOfPax(1);service.submit(owner.getEmail(),1L,input(0));
        assertThrows(ResponseStatusException.class,()->service.review("admin",1L,new ParticipationService.Review(0L,"READY")));
        assertEquals("REVIEW_REQUIRED",b.getParticipationStatus());
    }
    @Test void updatingReviewedDeclarationInvalidatesReview() {
        service.submit(owner.getEmail(),1L,input(0));service.review("admin",1L,new ParticipationService.Review(1L,"READY"));
        service.submit(owner.getEmail(),1L,input(2));assertEquals("REVIEW_REQUIRED",b.getParticipationStatus());
    }
    @Test void paymentInFlightFreezesDeclarationAndReview() {
        var payment=new PaymentTransaction();payment.setStatus("PENDING");when(payments.findByBookingIdOrderByIdDesc(1L)).thenReturn(List.of(payment));
        assertThrows(ResponseStatusException.class,()->service.submit(owner.getEmail(),1L,input(0)));
        assertThrows(ResponseStatusException.class,()->service.review("admin",1L,new ParticipationService.Review(0L,"READY")));
        verifyNoInteractions(declarations);
    }
    @Test void cipherRejectsTamperingAndCrossBookingReplayAndMissingKey() {
        String encrypted=cipher.encrypt(1L,"private-note");assertEquals("private-note",cipher.decrypt(1L,encrypted));
        assertThrows(ResponseStatusException.class,()->cipher.decrypt(2L,encrypted));
        assertThrows(ResponseStatusException.class,()->cipher.decrypt(1L,encrypted.substring(0,encrypted.length()-5)+"AAAAA"));
        assertThrows(ResponseStatusException.class,()->new HealthCipher("").encrypt(1L,"note"));
    }
    @Test void holdsExpireOnceWithoutReleasingPaidOrPendingSeats() {
        b.setParticipationDeadline(LocalDateTime.now().minusMinutes(1));maintenance.expire(1L);maintenance.expire(1L);
        assertEquals("CANCELLED",b.getStatus());assertEquals(4,b.getSchedule().getAvailableSlots());verify(schedules,times(1)).save(any());
        b.setStatus("PENDING");var p=new PaymentTransaction();p.setStatus("SUCCESS");when(payments.findByBookingIdOrderByIdDesc(1L)).thenReturn(List.of(p));
        maintenance.expire(1L);assertEquals("PENDING",b.getStatus());assertEquals(4,b.getSchedule().getAvailableSlots());
    }
    @Test void retentionRemovesOnlyExpiredContentAndAuditsMetadata() {
        service.submit(owner.getEmail(),1L,input(0));maintenance.purge(1L);verify(declarations,never()).delete(any());
        stored.setPurgeAfter(Instant.now().minusSeconds(1));assertNull(service.get(owner.getEmail(),1L,false).declaration());
        maintenance.purge(1L);verify(declarations).delete(stored);
    }
    @Test void ownerCanDeleteAfterCancellationButNotActiveTrip() {
        service.submit(owner.getEmail(),1L,input(0));assertThrows(ResponseStatusException.class,()->service.delete(owner.getEmail(),1L));
        b.setStatus("CANCELLED");service.delete(owner.getEmail(),1L);verify(declarations).delete(stored);
    }
    @Test void nonReadyDecisionRequiresPrivateReasonVisibleOnlyInEncryptedDeclaration() {
        service.submit(owner.getEmail(),1L,input(0));
        assertThrows(IllegalArgumentException.class,()->service.review("admin",1L,new ParticipationService.Review(1L,"NEEDS_CONTACT")));
        var view=service.review("admin",1L,new ParticipationService.Review(1L,"NEEDS_CONTACT","Arrange a private call"));
        assertEquals("Arrange a private call",view.declaration().reviewNote());
        assertFalse(stored.getEncryptedContent().contains("Arrange a private call"));
        assertEquals("Arrange a private call",service.get(owner.getEmail(),1L,false).declaration().reviewNote());
    }
}
