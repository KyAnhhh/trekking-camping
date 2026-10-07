package com.trekkingcamping.backend.module.auth;

import com.trekkingcamping.backend.common.exception.GlobalExceptionHandler;
import com.trekkingcamping.backend.module.auth.controller.AuthController;
import com.trekkingcamping.backend.module.user.dto.*;
import com.trekkingcamping.backend.module.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthContractTest {
    private final UserService service = mock(UserService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AuthController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void loginExposesTokenInsideDataEnvelope() throws Exception {
        UserResponseDto user = new UserResponseDto();
        user.setEmail("traveler@example.test");
        user.setRole("ROLE_USER");
        when(service.login(any())).thenReturn(new LoginResponseDto("test-token", user));
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"email\":\"traveler@example.test\",\"password\":\"test-only\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(1000))
                .andExpect(jsonPath("$.data.token").value("test-token"))
                .andExpect(jsonPath("$.data.user.role").value("ROLE_USER"));
    }

    @Test
    void registrationBindsFullName() throws Exception {
        mvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"fullName\":\"Traveler\",\"email\":\"traveler@example.test\",\"password\":\"test-only\"}"))
                .andExpect(status().isOk());
        verify(service).registerUser(argThat(request -> "Traveler".equals(request.getFullName())));
    }

    @Test
    void invalidCredentialsHave401AndConsistentErrorBody() throws Exception {
        when(service.login(any())).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai thông tin đăng nhập."));
        mvc.perform(post("/api/auth/login").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("Sai thông tin đăng nhập."));
    }
}
