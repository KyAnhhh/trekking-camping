package com.trekkingcamping.backend.module.booking;
import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.booking.service.BookingChangeService;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingChangeServiceTest {
 BookingRepository bookings=mock(BookingRepository.class);
 BookingChangeRequestRepository requests=mock(BookingChangeRequestRepository.class);
 TourScheduleRepository schedules=mock(TourScheduleRepository.class);
 PaymentTransactionRepository payments=mock(PaymentTransactionRepository.class);
 UserRepository users=mock(UserRepository.class);
 NotificationService notices=mock(NotificationService.class);
 EntityManager em=mock(EntityManager.class);
 BookingChangeService service=new BookingChangeService(bookings,requests,schedules,payments,users,notices,em);
 Booking b;TourSchedule old,next;Tour tour;User owner;List<PaymentTransaction> tx=new ArrayList<>();
 @BeforeEach void setup(){
  owner=new User();owner.setId(1L);owner.setIsActive(true);owner.setEmail("user@test.invalid");
  User admin=new User();admin.setId(2L);admin.setIsActive(true);Role role=new Role();role.setName("ROLE_ADMIN");admin.setRole(role);
  when(users.findByEmail("user")).thenReturn(Optional.of(owner));when(users.findByEmail("admin")).thenReturn(Optional.of(admin));
  tour=new Tour();tour.setId(4L);tour.setIsActive(true);tour.setPricePerPax(new BigDecimal("100"));
  old=schedule(10L,0);old.setStatus("FULL");next=schedule(11L,5);
  b=new Booking();b.setId(3L);b.setUser(owner);b.setSchedule(old);b.setNumberOfPax(2);b.setTotalAmount(new BigDecimal("200"));b.setStatus("CONFIRMED");
  when(bookings.findByIdForUpdate(3L)).thenReturn(Optional.of(b));when(bookings.findById(3L)).thenReturn(Optional.of(b));
  when(schedules.findById(11L)).thenReturn(Optional.of(next));
  when(schedules.findByIdForUpdate(11L)).thenReturn(Optional.of(next));when(schedules.findByIdForUpdate(10L)).thenReturn(Optional.of(old));
  when(payments.findByBookingIdOrderByIdDesc(3L)).thenReturn(tx);
  when(requests.saveAndFlush(any())).thenAnswer(i->{BookingChangeRequest r=i.getArgument(0);r.setId(7L);when(requests.findById(7L)).thenReturn(Optional.of(r));return r;});
 }
 TourSchedule schedule(Long id,int slots){var s=new TourSchedule();s.setId(id);s.setTour(tour);s.setStatus("OPEN");s.setAvailableSlots(slots);s.setDepartureDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(20));s.setReturnDate(s.getDepartureDate().plusDays(2));return s;}
 BookingChangeRequest create(String type){return service.create("user",3L,new BookingChangeService.Create(type,"CANCEL".equals(type)?null:11L,"Reason",new BigDecimal("200")));}
 void approve(){service.decide("admin",3L,7L,new BookingChangeService.Decision("APPROVED","Reviewed"));}
 void status(int expected,Runnable r){assertEquals(expected,assertThrows(ResponseStatusException.class,r::run).getStatusCode().value());}
 void payment(String status){var p=new PaymentTransaction();p.setStatus(status);p.setAmount(new BigDecimal("200"));tx.add(p);}
 @Test void ownerIsolation(){owner.setId(99L);User stranger=new User();stranger.setId(1L);stranger.setIsActive(true);when(users.findByEmail("stranger")).thenReturn(Optional.of(stranger));status(404,()->service.history("stranger",3L,false));}
 @Test void nonAdminCannotReview(){create("CANCEL");status(403,()->service.decide("user",3L,7L,new BookingChangeService.Decision("APPROVED","no")));}
 @Test void onePendingRequest(){when(requests.existsByBookingIdAndStatus(3L,"PENDING")).thenReturn(true);status(409,()->create("CANCEL"));verify(requests,never()).saveAndFlush(any());}
 @Test void blankReasonRejected(){status(400,()->service.create("user",3L,new BookingChangeService.Create("CANCEL",null," ",null)));}
 @Test void staleClientPriceRejected(){status(409,()->service.create("user",3L,new BookingChangeService.Create("RESCHEDULE",11L,"why",BigDecimal.ONE)));}
 @Test void cancellationReleasesSeatsExactlyOnce(){var r=create("CANCEL");approve();approve();assertEquals("APPROVED",r.getStatus());assertEquals(2,old.getAvailableSlots());assertEquals("CANCELLED",b.getStatus());verify(schedules,times(1)).save(old);}
 @Test void paidCancellationNeedsRefundNotFakeRefund(){payment("SUCCESS");create("CANCEL");approve();assertEquals("REFUND_REQUIRED",tx.getFirst().getStatus());assertEquals("CANCELLED",b.getStatus());}
 @Test void pendingPaymentBlocksApproval(){payment("PENDING");var r=create("CANCEL");status(409,this::approve);assertEquals("PENDING",r.getStatus());assertEquals(0,old.getAvailableSlots());}
 @Test void rejectKeepsBookingAndSeats(){create("CANCEL");service.decide("admin",3L,7L,new BookingChangeService.Decision("REJECTED","not eligible"));assertEquals("CONFIRMED",b.getStatus());assertEquals(0,old.getAvailableSlots());verify(schedules,never()).save(any());}
 @Test void transferAndReplay(){create("RESCHEDULE");approve();approve();assertEquals(next,b.getSchedule());assertEquals(2,old.getAvailableSlots());assertEquals(3,next.getAvailableSlots());}
 @Test void noSeatsAtReview(){create("RESCHEDULE");next.setAvailableSlots(1);status(409,this::approve);assertEquals(old,b.getSchedule());assertEquals(0,old.getAvailableSlots());}
 @Test void changedPriceAtReview(){create("RESCHEDULE");tour.setPricePerPax(new BigDecimal("101"));status(409,this::approve);assertEquals(old,b.getSchedule());}
 @Test void changedPickupAtReview(){create("RESCHEDULE");next.setPickupPoint("changed");status(409,this::approve);}
 @Test void paidDifferenceCannotBeApproved(){payment("SUCCESS");b.setTotalAmount(new BigDecimal("199"));create("RESCHEDULE");status(409,this::approve);}
 @Test void anotherTourRejected(){Tour other=new Tour();other.setId(99L);next.setTour(other);status(400,()->create("RESCHEDULE"));}
 @Test void oppositeDecisionCannotOverwrite(){create("CANCEL");approve();status(409,()->service.decide("admin",3L,7L,new BookingChangeService.Decision("REJECTED","late")));}
 @Test void rescheduleRequiresFreshParticipationAndRetention(){b.setParticipationStatus("READY");b.setParticipationRevision(4L);var d=new ParticipationDeclaration();when(em.find(ParticipationDeclaration.class,3L)).thenReturn(d);create("RESCHEDULE");approve();assertEquals("INCOMPLETE",b.getParticipationStatus());assertEquals(5,b.getParticipationRevision());assertEquals("PENDING",b.getStatus());assertNotNull(d.getPurgeAfter());}
 @Test void paidSamePriceTransferPreservesApproval(){payment("SUCCESS");b.setParticipationStatus("READY");create("RESCHEDULE");approve();assertEquals("READY",b.getParticipationStatus());assertEquals("CONFIRMED",b.getStatus());assertEquals("SUCCESS",tx.getFirst().getStatus());}
}
