package com.trekkingcamping.backend.module.review;
import com.trekkingcamping.backend.module.review.service.ReviewService;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class ReviewServiceTest {
    TourReviewRepository reviews=mock(TourReviewRepository.class); BookingRepository bookings=mock(BookingRepository.class);
    TourRepository tours=mock(TourRepository.class); EntityManager em=mock(EntityManager.class);
    ReviewService service=new ReviewService(reviews,bookings,tours,em);
    Booking booking() {
        var u=new User();u.setId(1L);u.setEmail("owner");u.setFullName("Traveler");
        var t=new Tour();t.setId(1L);
        var s=new TourSchedule();s.setTour(t);s.setReturnDate(LocalDate.now().minusDays(2));
        var b=Booking.builder().id(1L).user(u).schedule(s).status("COMPLETED").build();
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(b));when(bookings.findById(1L)).thenReturn(Optional.of(b));return b;
    }
    @Test void otherUserCannotReadOrSubmitReview() {
        booking(); assertThrows(ResponseStatusException.class,()->service.eligibility("other",1L));
        assertThrows(ResponseStatusException.class,()->service.create("other",1L,new ReviewService.Input(5,"Good")));
        verifyNoInteractions(reviews);
    }
    @Test void onlyCompletedPastTripCanBeReviewedOnce() {
        var b=booking();b.setStatus("CONFIRMED");
        assertThrows(ResponseStatusException.class,()->service.create("owner",1L,new ReviewService.Input(5,"Good")));
        b.setStatus("COMPLETED");b.getSchedule().setReturnDate(LocalDate.now().plusDays(2));
        assertThrows(ResponseStatusException.class,()->service.create("owner",1L,new ReviewService.Input(5,"Good")));
        b.getSchedule().setReturnDate(LocalDate.now().minusDays(2));
        when(reviews.findByBookingId(1L)).thenReturn(Optional.of(new TourReview()));
        assertThrows(ResponseStatusException.class,()->service.create("owner",1L,new ReviewService.Input(5,"Good")));
        verify(reviews,never()).save(any());
    }
    @Test void savesVerifiedReviewWithoutExposingContactDetails() throws Exception {
        booking();when(reviews.save(any())).thenAnswer(i->i.getArgument(0));
        var result=service.create("owner",1L,new ReviewService.Input(4," Good tour "));
        assertEquals("Good tour",result.comment());assertTrue(result.verified());
        assertEquals("Traveler",result.author());verify(em).refresh(any());
    }
    @Test void ratingAndEmptyCommentAreValidatedBeforeDatabase() {
        for(var input: new ReviewService.Input[]{new ReviewService.Input(0,"Good"),new ReviewService.Input(6,"Good"),new ReviewService.Input(5," ")})
            assertThrows(IllegalArgumentException.class,()->service.create("owner",1L,input));
        verifyNoInteractions(bookings,reviews);
    }
}
