package com.trekkingcamping.backend.module.guide;
import com.trekkingcamping.backend.module.guide.controller.BookingGuideController;
import com.trekkingcamping.backend.module.guide.service.GuideService;
import com.trekkingcamping.backend.module.booking.service.BookingManagementService;
import com.trekkingcamping.backend.module.booking.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class BookingGuideControllerTest {
    BookingManagementService bookings = mock(BookingManagementService.class);
    GuideService guides = mock(GuideService.class);
    BookingGuideController controller = new BookingGuideController(bookings, guides);
    @Test void nonOwnerNeverReadsTeam() {
        when(bookings.getDetail("other@example.test", 1L, false)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        assertThrows(ResponseStatusException.class, () -> controller.client(1L, "other@example.test"));
        verifyNoInteractions(guides);
    }
    @Test void onlyConfirmedOwnerGetsPrivateContacts() {
        for (String status : new String[]{"PENDING", "CANCELLED", "CONFIRMED"}) {
            var booking = new BookingResponseDto(1L, "test", "Tour", "tour", 10L, null, null, 1, null, status, null);
            when(bookings.getDetail("owner@example.test", 1L, false)).thenReturn(new BookingDetailDto(booking, null, null, null, java.util.List.of(), false, false));
            controller.client(1L, "owner@example.test");
        }
        verify(guides, times(2)).bookingTeam(10L, false); verify(guides).bookingTeam(10L, true);
    }
}
