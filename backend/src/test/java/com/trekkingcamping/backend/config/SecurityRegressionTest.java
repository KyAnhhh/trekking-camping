package com.trekkingcamping.backend.config;

import com.trekkingcamping.backend.common.security.JwtAuthenticationFilter;
import com.trekkingcamping.backend.common.security.JwtTokenProvider;
import com.trekkingcamping.backend.module.user.entity.Role;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SecurityRegressionTest.ProbeController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, SecurityRegressionTest.ProbeController.class})
class SecurityRegressionTest {
    @Autowired MockMvc mvc;
    @MockBean JwtTokenProvider tokens;
    @MockBean UserRepository users;

    @RestController
    static class ProbeController {
        @RequestMapping({"/api/tours", "/api/tours/1/schedules", "/api/chat/ingest-tours", "/api/admin/data/ingest", "/api/users", "/api/admin/knowledge/files"})
        String probe() { return "ok"; }
        @PostMapping("/api/bookings")
        String booking(@AuthenticationPrincipal String email) { return email; }
    }

    @Test
    void anonymousCanReadToursButCannotWrite() throws Exception {
        mvc.perform(get("/api/tours")).andExpect(status().isOk());
        mvc.perform(post("/api/tours")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/bookings")).andExpect(status().isUnauthorized());
    }

    @Test
    void regularUserCannotAccessAdministrativeOperations() throws Exception {
        for (String path : new String[]{"/api/tours", "/api/tours/1/schedules", "/api/chat/ingest-tours", "/api/admin/data/ingest"}) {
            mvc.perform(post(path).with(user("traveler").roles("USER"))).andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/users").with(user("traveler").roles("USER"))).andExpect(status().isForbidden());
    }

    @Test
    void adminCanManageToursAndKnowledge() throws Exception {
        mvc.perform(post("/api/tours").with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        mvc.perform(get("/api/admin/knowledge/files").with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
    }

    @Test
    void bearerPrincipalIsEmailAndInactiveAccountIsRejected() throws Exception {
        when(tokens.validateToken("test-token")).thenReturn(true);
        when(tokens.matchesAuthVersion("test-token", 0L)).thenReturn(true);
        when(tokens.getUsernameFromToken("test-token")).thenReturn("traveler@example.test");
        User account = new User();
        account.setRole(new Role(1, "ROLE_USER"));
        when(users.findByEmail("traveler@example.test")).thenReturn(Optional.of(account));
        mvc.perform(post("/api/bookings").header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk()).andExpect(content().string("traveler@example.test"));
        account.setIsActive(false);
        mvc.perform(post("/api/bookings").header("Authorization", "Bearer test-token"))
                .andExpect(status().isUnauthorized());
    }
}
