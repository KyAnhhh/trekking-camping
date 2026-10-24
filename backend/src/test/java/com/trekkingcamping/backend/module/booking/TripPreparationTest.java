package com.trekkingcamping.backend.module.booking;
import com.trekkingcamping.backend.module.booking.service.TripPreparationService;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TripPreparationTest {
 BookingRepository bookings=mock(BookingRepository.class);UserRepository users=mock(UserRepository.class);TourGearRepository gears=mock(TourGearRepository.class);JdbcTemplate jdbc=mock(JdbcTemplate.class);
 TripPreparationService service=new TripPreparationService(bookings,users,gears,jdbc);Booking b;User u;Tour tour;
 @BeforeEach void setup(){u=new User();u.setId(1L);u.setEmail("owner");u.setIsActive(true);b=new Booking();b.setId(2L);b.setUser(u);tour=new Tour();tour.setId(3L);var schedule=new TourSchedule();schedule.setTour(tour);b.setSchedule(schedule);when(users.findByEmail("owner")).thenReturn(Optional.of(u));when(users.findById(1L)).thenReturn(Optional.of(u));when(bookings.findById(2L)).thenReturn(Optional.of(b));when(bookings.findByIdForUpdate(2L)).thenReturn(Optional.of(b));}
 @Test void emptyTourDoesNotInventGear(){assertTrue(service.get("owner",2L).items().isEmpty());assertNull(service.get("owner",2L).pickupPoint());}
 @Test void anotherOwnerCannotReadOrWrite(){var other=new User();other.setId(9L);other.setIsActive(true);when(users.findByEmail("other")).thenReturn(Optional.of(other));assertThrows(ResponseStatusException.class,()->service.get("other",2L));assertThrows(ResponseStatusException.class,()->service.add("other",2L,"x"));verifyNoInteractions(jdbc);}
 @Test void providedGearIsExcluded(){var g=new TourGear();g.setId(1L);g.setGearName("Tent");g.setIsProvided(true);when(gears.findByTourId(3L)).thenReturn(List.of(g));assertTrue(service.get("owner",2L).items().isEmpty());g.setIsProvided(false);assertEquals("Tent",service.get("owner",2L).items().getFirst().label());}
 @Test void customNotesNeverReachAssistant(){when(jdbc.queryForList(anyString(),eq(2L))).thenReturn(List.of(Map.of("item_key","c:1","label","Private note","checked",true)));assertEquals(1,service.get("owner",2L).items().size());assertTrue(service.forAssistant(1L,2L).items().isEmpty());}
 @Test void nonexistentChecklistKeyRejected(){assertThrows(ResponseStatusException.class,()->service.check("owner",2L,"not-in-tour",true));}
 @Test void checkedDefaultPersistsByStableKey(){tour.setRequiredGear("Water\nShoes");String key=service.get("owner",2L).items().getFirst().key();when(jdbc.queryForList(anyString(),eq(2L))).thenReturn(List.of(Map.of("item_key",key,"checked",true)));assertTrue(service.get("owner",2L).items().getFirst().checked());service.check("owner",2L,key,false);verify(jdbc).update(contains("ON CONFLICT"),eq(2L),eq(key),eq(false));}
 @Test void emptyAndOversizedCustomRejected(){assertThrows(IllegalArgumentException.class,()->service.add("owner",2L," "));assertThrows(IllegalArgumentException.class,()->service.add("owner",2L,"a".repeat(501)));}
 @Test void customLimitEnforcedUnderBookingLock(){when(jdbc.queryForObject(anyString(),eq(Long.class),eq(2L))).thenReturn(50L);assertThrows(IllegalArgumentException.class,()->service.add("owner",2L,"Shoes"));verify(bookings).findByIdForUpdate(2L);}
 @Test void deletingOnlyTargetsCustomRows(){service.remove("owner",2L,"g:1");verify(jdbc).update(contains("label IS NOT NULL"),eq(2L),eq("g:1"));}
}
