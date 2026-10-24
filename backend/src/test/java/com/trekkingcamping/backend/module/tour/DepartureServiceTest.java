package com.trekkingcamping.backend.module.tour;
import com.trekkingcamping.backend.module.tour.service.DepartureService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class DepartureServiceTest {
    JdbcTemplate jdbc=mock(JdbcTemplate.class);
    DepartureService service=new DepartureService(jdbc);
    @Test void rejectsReversedDates() {
        assertThrows(ResponseStatusException.class,()->service.list(LocalDate.of(2026,12,1),LocalDate.of(2026,11,1),"",null,1,true));
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsUnboundedRange() {
        assertThrows(ResponseStatusException.class,()->service.list(LocalDate.of(2026,1,1),LocalDate.of(2026,12,31),"",null,1,true));
        verifyNoInteractions(jdbc);
    }
    @Test void validatesPeopleAndDifficulty() {
        var d=LocalDate.of(2026,11,1);
        assertThrows(ResponseStatusException.class,()->service.list(d,d,"",null,0,true));
        assertThrows(ResponseStatusException.class,()->service.list(d,d,"",4,1,true));
        verifyNoInteractions(jdbc);
    }
}
