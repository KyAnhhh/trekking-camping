package com.trekkingcamping.backend.module.tour;

import com.trekkingcamping.backend.module.tour.service.FavoriteService;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class FavoriteServiceTest {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    UserRepository users = mock(UserRepository.class);
    TourRepository tours = mock(TourRepository.class);
    FavoriteService service = new FavoriteService(jdbc,users,tours);
    @BeforeEach void setup() {
        User u = new User(); u.setId(7L);
        when(users.findByEmail("a@test.invalid")).thenReturn(Optional.of(u));
    }
    @Test void rejectsAnonymous() {
        assertEquals(401,assertThrows(ResponseStatusException.class,() -> service.ids(null)).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsInactiveUser() {
        User u = new User(); u.setId(8L); u.setIsActive(false);
        when(users.findByEmail("inactive")).thenReturn(Optional.of(u));
        assertEquals(401,assertThrows(ResponseStatusException.class,() -> service.remove("inactive",1)).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsInactiveTour() {
        Tour t = new Tour(); t.setIsActive(false);
        when(tours.findByIdForUpdate(1L)).thenReturn(Optional.of(t));
        assertEquals(404,assertThrows(ResponseStatusException.class,() -> service.save("a@test.invalid",1)).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsMissingTour() {
        assertEquals(404,assertThrows(ResponseStatusException.class,() -> service.save("a@test.invalid",999)).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void saveUsesOwnerAndConflictSafeInsert() {
        when(tours.findByIdForUpdate(1L)).thenReturn(Optional.of(new Tour()));
        service.save("a@test.invalid",1);
        service.save("a@test.invalid",1);
        verify(jdbc,times(2)).update("INSERT INTO tour_favorites(user_id,tour_id) VALUES (?,?) ON CONFLICT(user_id,tour_id) DO NOTHING",7L,1L);
    }
    @Test void deleteIsOwnerScopedAndRepeatable() {
        service.remove("a@test.invalid",1); service.remove("a@test.invalid",1);
        verify(jdbc,times(2)).update("DELETE FROM tour_favorites WHERE user_id=? AND tour_id=?",7L,1L);
    }
    @Test void boundsPagination() {
        assertThrows(ResponseStatusException.class,() -> service.list("a@test.invalid",-1,12));
        assertThrows(ResponseStatusException.class,() -> service.list("a@test.invalid",0,100));
        verifyNoInteractions(jdbc);
    }
    @Test void idsAreOwnerScopedAndPublicOnly() {
        service.ids("a@test.invalid");
        verify(jdbc).queryForList("SELECT t.id FROM tour_favorites f JOIN tours t ON t.id=f.tour_id WHERE f.user_id=? AND t.is_active=true ORDER BY t.id",Long.class,7L);
    }
}
