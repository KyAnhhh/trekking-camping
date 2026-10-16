package com.trekkingcamping.backend.config;

import com.trekkingcamping.backend.common.security.JwtAuthenticationFilter;
import com.trekkingcamping.backend.common.security.JwtTokenProvider;
import com.trekkingcamping.backend.module.auth.controller.AuthController;
import com.trekkingcamping.backend.module.auth.controller.AccountRecoveryController;
import com.trekkingcamping.backend.module.auth.service.AccountRecoveryService;
import com.trekkingcamping.backend.module.tour.controller.TourImportController;
import com.trekkingcamping.backend.module.tour.controller.TourImageController;
import com.trekkingcamping.backend.module.tour.service.TourImportService;
import com.trekkingcamping.backend.module.tour.service.TourImageService;
import com.trekkingcamping.backend.module.tour.service.TourImageStorage;
import com.trekkingcamping.backend.module.booking.controller.BookingController;
import com.trekkingcamping.backend.module.booking.service.BookingService;
import com.trekkingcamping.backend.module.booking.controller.BookingManagementController;
import com.trekkingcamping.backend.module.booking.controller.MomoPaymentController;
import com.trekkingcamping.backend.module.booking.service.BookingManagementService;
import com.trekkingcamping.backend.module.booking.service.MomoPaymentService;
import com.trekkingcamping.backend.module.chat.controller.ChatController;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import com.trekkingcamping.backend.module.chat.service.DataIngestionService;
import com.trekkingcamping.backend.module.ingestion.controller.IngestionController;
import com.trekkingcamping.backend.module.ingestion.service.IngestionService;
import com.trekkingcamping.backend.module.knowledge.controller.KnowledgeController;
import com.trekkingcamping.backend.module.knowledge.service.KnowledgeService;
import com.trekkingcamping.backend.module.tour.controller.TourController;
import com.trekkingcamping.backend.module.tour.service.TourService;
import com.trekkingcamping.backend.module.user.controller.UserController;
import com.trekkingcamping.backend.module.user.entity.Role;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controllers, security chain and JWT signatures; business services and DB are mocked. */
@WebMvcTest(controllers = {AuthController.class, AccountRecoveryController.class,
        com.trekkingcamping.backend.module.notification.controller.NotificationController.class,
        com.trekkingcamping.backend.module.guide.controller.GuideWorkspaceController.class,
        com.trekkingcamping.backend.module.guide.controller.GuideInvitationController.class,
        com.trekkingcamping.backend.module.booking.controller.PassengerController.class,
        com.trekkingcamping.backend.module.admin.controller.AdminOperationsController.class,
        com.trekkingcamping.backend.module.user.controller.AccountController.class,
        com.trekkingcamping.backend.module.planner.controller.PlannerController.class,
        com.trekkingcamping.backend.module.review.controller.ReviewController.class,
        com.trekkingcamping.backend.module.tour.controller.TourManagementController.class,
        com.trekkingcamping.backend.module.guide.controller.GuideController.class,
        com.trekkingcamping.backend.module.guide.controller.BookingGuideController.class,
        TourImportController.class, TourImageController.class, UserController.class, TourController.class,
        BookingController.class, BookingManagementController.class, MomoPaymentController.class,
        com.trekkingcamping.backend.module.booking.controller.ParticipationController.class,
        ChatController.class, IngestionController.class, KnowledgeController.class},
        excludeAutoConfiguration = UserDetailsServiceAutoConfiguration.class,
        properties = {"jwt.secret=", "logging.level.root=ERROR", "debug=false"})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
class ApiAuthorizationMatrixTest {
    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider tokens;
    @MockBean UserRepository users;
    @MockBean com.trekkingcamping.backend.module.user.service.AdminUserService adminUsers;
    @MockBean com.trekkingcamping.backend.module.notification.service.NotificationService notifications;
    @MockBean com.trekkingcamping.backend.module.guide.service.GuideWorkspaceService workspace;
    @MockBean com.trekkingcamping.backend.module.guide.service.GuideInvitationService invitations;
    @MockBean com.trekkingcamping.backend.module.booking.service.PassengerService passengers;
    @MockBean com.trekkingcamping.backend.module.admin.service.AdminOperationsService operations;
    @MockBean UserService userService;
    @MockBean com.trekkingcamping.backend.module.user.service.AccountService accountService;
    @MockBean com.trekkingcamping.backend.module.planner.service.PlannerService plannerService;
    @MockBean com.trekkingcamping.backend.module.planner.service.PlanStore planStore;
    @MockBean com.trekkingcamping.backend.module.review.service.ReviewService reviewService;
    @MockBean com.trekkingcamping.backend.module.tour.service.TourManagementService tourManagement;
    @MockBean AccountRecoveryService recovery;
    @MockBean TourImportService tourImport;
    @MockBean TourImageService tourImages;
    @MockBean TourImageStorage imageStorage;
    @MockBean TourService tourService;
    @MockBean com.trekkingcamping.backend.module.guide.service.GuideService guideService;
    @MockBean com.trekkingcamping.backend.module.guide.service.GuideImageStorage guideImages;
    @MockBean com.trekkingcamping.backend.module.guide.service.GuideImportService guideImport;
    @MockBean BookingService bookingService;
    @MockBean BookingManagementService bookingManagement;
    @MockBean com.trekkingcamping.backend.module.booking.service.ParticipationService participation;
    @MockBean MomoPaymentService momoPayment;
    @MockBean ChatService chatService;
    @MockBean com.trekkingcamping.backend.module.chat.service.ChatAssistant assistant;
    @MockBean com.trekkingcamping.backend.module.chat.service.ChatSessions chatSessions;
    @MockBean com.trekkingcamping.backend.module.chat.service.ChatBookingService chatBookings;
    @MockBean com.trekkingcamping.backend.module.chat.service.ChatRateLimit chatLimits;
    @MockBean DataIngestionService tourIngestion;
    @MockBean IngestionService ingestionService;
    @MockBean KnowledgeService knowledgeService;

    record Endpoint(String method, String path, String access) {
        @Override public String toString() { return method + " " + path; }
    }

    static Stream<Arguments> accessMatrix() {
        var endpoints = List.of(
                new Endpoint("GET", "/api/admin/guides/1/invitation", "ADMIN"),
                new Endpoint("POST", "/api/admin/guides/1/invitation", "ADMIN"),
                new Endpoint("DELETE", "/api/admin/guides/1/invitation", "ADMIN"),
                new Endpoint("POST", "/api/guide-invitations/preview", "PUBLIC"),
                new Endpoint("POST", "/api/guide-invitations/accept", "PUBLIC"),
                new Endpoint("GET", "/api/bookings/1/passengers", "AUTHENTICATED"),
                new Endpoint("PUT", "/api/bookings/1/passengers", "AUTHENTICATED"),
                new Endpoint("GET", "/api/bookings/1/passengers/history", "AUTHENTICATED"),
                new Endpoint("GET", "/api/admin/bookings/1/passengers", "ADMIN"),
                new Endpoint("PUT", "/api/admin/bookings/1/passengers", "ADMIN"),
                new Endpoint("GET", "/api/admin/bookings/1/passengers/history", "ADMIN"),
                new Endpoint("GET", "/api/guide-workspace/trips/1/bookings/1/passengers", "GUIDE"),
                new Endpoint("GET", "/api/guide-workspace/trips/1/bookings/1/passengers/history", "GUIDE"),
                new Endpoint("PUT", "/api/guide-workspace/trips/1/bookings/1/passengers/1/attendance", "GUIDE"),
                new Endpoint("GET", "/api/notifications", "AUTHENTICATED"),
                new Endpoint("GET", "/api/notifications/unread-count", "AUTHENTICATED"),
                new Endpoint("PUT", "/api/notifications/1/read", "AUTHENTICATED"),
                new Endpoint("PUT", "/api/notifications/read-all", "AUTHENTICATED"),
                new Endpoint("GET", "/api/guide-workspace/trips", "GUIDE"),
                new Endpoint("GET", "/api/guide-workspace/trips/1", "GUIDE"),
                new Endpoint("PUT", "/api/guide-workspace/trips/1/bookings/1/attendance", "GUIDE"),
                new Endpoint("GET", "/api/admin/guides/1/account", "ADMIN"),
                new Endpoint("PUT", "/api/admin/guides/1/account", "ADMIN"),
                new Endpoint("GET", "/api/admin/operations/overview", "ADMIN"),
                new Endpoint("GET", "/api/admin/operations/bookings", "ADMIN"),
                new Endpoint("GET", "/api/admin/operations/payments", "ADMIN"),
                new Endpoint("POST", "/api/admin/operations/payments/1/reconcile", "ADMIN"),
                new Endpoint("GET", "/api/admin/operations/reviews", "ADMIN"),
                new Endpoint("PUT", "/api/admin/operations/reviews/1/visibility", "ADMIN"),
                new Endpoint("POST", "/api/chat/sessions", "PUBLIC"),
                new Endpoint("POST", "/api/chat/history", "PUBLIC"),
                new Endpoint("POST", "/api/chat/booking-drafts", "AUTHENTICATED"),
                new Endpoint("POST", "/api/chat/booking-drafts/demo/confirm", "AUTHENTICATED"),
                new Endpoint("GET", "/api/bookings/1/participation", "AUTHENTICATED"),
                new Endpoint("PUT", "/api/bookings/1/participation", "AUTHENTICATED"),
                new Endpoint("DELETE", "/api/bookings/1/participation", "AUTHENTICATED"),
                new Endpoint("GET", "/api/admin/bookings/1/participation", "ADMIN"),
                new Endpoint("POST", "/api/admin/bookings/1/participation/review", "ADMIN"),
                new Endpoint("GET", "/api/account", "AUTHENTICATED"),
                new Endpoint("PUT", "/api/account", "AUTHENTICATED"),
                new Endpoint("POST", "/api/account/password", "AUTHENTICATED"),
                new Endpoint("GET", "/api/plans", "AUTHENTICATED"),
                new Endpoint("POST", "/api/plans", "AUTHENTICATED"),
                new Endpoint("GET", "/api/plans/1", "AUTHENTICATED"),
                new Endpoint("DELETE", "/api/plans/1", "AUTHENTICATED"),
                new Endpoint("GET", "/api/tours/1/reviews", "PUBLIC"),
                new Endpoint("GET", "/api/bookings/1/review", "AUTHENTICATED"),
                new Endpoint("POST", "/api/bookings/1/review", "AUTHENTICATED"),
                new Endpoint("POST", "/api/admin/bookings/1/complete", "ADMIN"),
                new Endpoint("GET", "/api/admin/tours", "ADMIN"),
                new Endpoint("GET", "/api/admin/tours/test-tour", "ADMIN"),
                new Endpoint("GET", "/api/admin/tours/1/images", "ADMIN"),
                new Endpoint("PUT", "/api/admin/tours/1", "ADMIN"),
                new Endpoint("PUT", "/api/admin/tours/1/active", "ADMIN"),
                new Endpoint("PUT", "/api/admin/tours/1/schedules/1", "ADMIN"),
                new Endpoint("GET", "/api/admin/guides", "ADMIN"),
                new Endpoint("POST", "/api/admin/guides", "ADMIN"),
                new Endpoint("POST", "/api/admin/guides/import", "ADMIN"),
                new Endpoint("PUT", "/api/admin/guides/1", "ADMIN"),
                new Endpoint("POST", "/api/admin/guides/1/avatar", "ADMIN"),
                new Endpoint("GET", "/api/admin/schedules/1/guides", "ADMIN"),
                new Endpoint("PUT", "/api/admin/schedules/1/guides", "ADMIN"),
                new Endpoint("GET", "/api/guides/1", "PUBLIC"),
                new Endpoint("GET", "/api/bookings/1/guides", "AUTHENTICATED"),
                new Endpoint("GET", "/api/admin/bookings/1/guides", "ADMIN"),
                new Endpoint("GET", "/api/media/guides/00000000-0000-0000-0000-000000000001.jpg", "PUBLIC"),
                new Endpoint("POST", "/api/auth/login", "PUBLIC"),
                new Endpoint("POST", "/api/auth/register", "PUBLIC"),
                new Endpoint("POST", "/api/auth/forgot-password", "PUBLIC"),
                new Endpoint("POST", "/api/auth/reset-password", "PUBLIC"),
                new Endpoint("POST", "/api/auth/logout", "AUTHENTICATED"),
                new Endpoint("POST", "/api/admin/tours/import", "ADMIN"),
                new Endpoint("GET", "/api/tours/1/images", "PUBLIC"),
                new Endpoint("POST", "/api/tours/1/images", "ADMIN"),
                new Endpoint("POST", "/api/tours/1/images/1/cover", "ADMIN"),
                new Endpoint("DELETE", "/api/tours/1/images/1", "ADMIN"),
                new Endpoint("GET", "/api/media/tours/00000000-0000-0000-0000-000000000001.jpg", "PUBLIC"),
                new Endpoint("POST", "/api/chat", "PUBLIC"),
                new Endpoint("GET", "/api/tours", "PUBLIC"),
                new Endpoint("GET", "/api/tours/sample-tour", "PUBLIC"),
                new Endpoint("GET", "/api/tours/1/itineraries", "PUBLIC"),
                new Endpoint("GET", "/api/tours/1/schedules", "PUBLIC"),
                new Endpoint("GET", "/api/tours/1/gears", "PUBLIC"),
                new Endpoint("POST", "/api/bookings", "AUTHENTICATED"),
                new Endpoint("GET", "/api/bookings/my-bookings", "AUTHENTICATED"),
                new Endpoint("GET", "/api/bookings/1", "AUTHENTICATED"),
                new Endpoint("POST", "/api/bookings/1/cancel", "AUTHENTICATED"),
                new Endpoint("POST", "/api/payments/momo/start", "AUTHENTICATED"),
                new Endpoint("POST", "/api/payments/momo/MM-test/refresh", "AUTHENTICATED"),
                new Endpoint("GET", "/api/admin/bookings", "ADMIN"),
                new Endpoint("GET", "/api/admin/bookings/1", "ADMIN"),
                new Endpoint("POST", "/api/admin/bookings/1/cancel", "ADMIN"),
                new Endpoint("POST", "/api/admin/bookings/1/confirm", "ADMIN"),
                new Endpoint("GET", "/api/users", "ADMIN"),
                new Endpoint("PUT", "/api/users/1", "ADMIN"),
                new Endpoint("PUT", "/api/users/1/active", "ADMIN"),
                new Endpoint("DELETE", "/api/users/1?updatedAt=2026-10-15T10:00:00", "ADMIN"),
                new Endpoint("POST", "/api/tours", "ADMIN"),
                new Endpoint("POST", "/api/tours/1/itineraries", "ADMIN"),
                new Endpoint("POST", "/api/tours/1/schedules", "ADMIN"),
                new Endpoint("POST", "/api/tours/1/gears", "ADMIN"),
                new Endpoint("POST", "/api/chat/ingest-tours", "ADMIN"),
                new Endpoint("POST", "/api/admin/data/ingest", "ADMIN"),
                new Endpoint("POST", "/api/admin/knowledge/upload", "ADMIN"),
                new Endpoint("GET", "/api/admin/knowledge/files", "ADMIN"),
                new Endpoint("DELETE", "/api/admin/knowledge/delete?fileName=guide.txt", "ADMIN")
        );
        return endpoints.stream().flatMap(endpoint -> Stream.of("ANONYMOUS", "USER", "ADMIN", "GUIDE")
                .map(actor -> Arguments.of(endpoint, actor)));
    }

    @ParameterizedTest(name = "{0} as {1}")
    @MethodSource("accessMatrix")
    void allExistingEndpointsEnforceTheirAccessLevel(Endpoint endpoint, String actor) throws Exception {
        MockHttpServletRequestBuilder request;
        if (endpoint.method().equals("POST") && (endpoint.path().endsWith("/avatar") || endpoint.path().endsWith("/upload") || endpoint.path().endsWith("/import") || endpoint.path().endsWith("/images"))) {
            request = multipart(endpoint.path()).file(new org.springframework.mock.web.MockMultipartFile(
                    "file", "guide.txt", "text/plain", "knowledge".getBytes(StandardCharsets.UTF_8)));
        } else {
            request = request(HttpMethod.valueOf(endpoint.method()), endpoint.path());
            if ("POST".equals(endpoint.method())) request.contentType("application/json")
                    .content(endpoint.path().equals("/api/payments/momo/start") ? "{\"bookingId\":1}" : "{}");
            if ("PUT".equals(endpoint.method())) request.contentType("application/json").content(endpoint.path().endsWith("/guides") ? "[]" : "{}");
        }
        when(knowledgeService.deleteKnowledgeByFileName("guide.txt")).thenReturn(true);
        var bookingRow = new com.trekkingcamping.backend.module.booking.dto.BookingResponseDto(1L, "test", "Tour", "tour", 10L, null, null, 1, null, "PENDING", null);
        when(bookingManagement.getDetail(anyString(), eq(1L), anyBoolean())).thenReturn(new com.trekkingcamping.backend.module.booking.dto.BookingDetailDto(bookingRow, null, null, null, List.of(), false, false));
        if (!"ANONYMOUS".equals(actor)) {
            account("actor@example.test", "ROLE_" + actor, true);
            request.header("Authorization", "Bearer " + tokens.generateToken("actor@example.test", "ROLE_" + actor));
        }

        int expected = "PUBLIC".equals(endpoint.access()) ? 200
                : "ANONYMOUS".equals(actor) ? 401
                : "ADMIN".equals(endpoint.access()) && !"ADMIN".equals(actor) ? 403
                : "GUIDE".equals(endpoint.access()) && !"GUIDE".equals(actor) ? 403 : 200;
        mvc.perform(request).andExpect(status().is(expected));
        if (expected != 200) {
            verifyNoInteractions(userService, tourService, bookingService, chatService,
                    tourIngestion, ingestionService, knowledgeService, bookingManagement, momoPayment,
                    recovery, tourImport, tourImages, imageStorage, guideService, guideImages, guideImport,
                    accountService, plannerService, planStore, reviewService, tourManagement, notifications, workspace, adminUsers, invitations, passengers);
        }
        if (expected == 200 && endpoint.path().equals("/api/bookings")) {
            verify(bookingService).createBooking(eq("actor@example.test"), any());
        }
    }

    @Test
    void onlyPostIpnIsPublicAndDelegatesSignatureVerification() throws Exception {
        mvc.perform(post("/api/payments/momo/ipn").contentType("application/json").content("{}"))
                .andExpect(status().isNoContent());
        verify(momoPayment).notification(any());
        mvc.perform(get("/api/payments/momo/ipn")).andExpect(status().isUnauthorized());
    }

    @Test
    void invalidAndForgedTokensCannotAccessProtectedApi() throws Exception {
        account("actor@example.test", "ROLE_ADMIN", true);
        mvc.perform(get("/api/users").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
        String valid = tokens.generateToken("actor@example.test", "ROLE_ADMIN");
        String[] parts = valid.split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("actor@example.test", "other@example.test");
        String forged = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(userService);
    }

    @Test
    void revokedSessionCannotAccessProtectedApiEvenWithValidSignature() throws Exception {
        account("actor@example.test", "ROLE_USER", true);
        var account = users.findByEmail("actor@example.test").orElseThrow();
        account.setAuthVersion(1L);
        mvc.perform(get("/api/bookings/my-bookings").header("Authorization", "Bearer " + tokens.generateToken(account.getEmail(), "ROLE_USER", 0L)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(bookingService);
    }

    @Test
    void adminClaimCannotOverrideCurrentUserRoleInDatabase() throws Exception {
        account("actor@example.test", "ROLE_USER", true);
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + tokens.generateToken("actor@example.test", "ROLE_ADMIN")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    void inactiveOrDeletedAccountsCannotUsePreviouslyIssuedToken() throws Exception {
        String token = tokens.generateToken("actor@example.test", "ROLE_ADMIN");
        account("actor@example.test", "ROLE_ADMIN", false);
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        when(users.findByEmail("actor@example.test")).thenReturn(Optional.empty());
        mvc.perform(get("/api/bookings/my-bookings").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(userService, bookingService);
    }

    @Test
    void rawAdminRoleIsNormalizedAndProtectedRequestsNeedBearerHeader() throws Exception {
        account("actor@example.test", "ADMIN", true);
        String token = tokens.generateToken("actor@example.test", "ADMIN");
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/users").header("Authorization", token)).andExpect(status().isUnauthorized());
    }

    @Test
    void preflightDoesNotGrantAccessToTheActualAdminOperation() throws Exception {
        mvc.perform(options("/api/admin/knowledge/files")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/knowledge/files").header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(knowledgeService);
    }

    private void account(String email, String role, boolean active) {
        User user = new User();
        user.setEmail(email);
        user.setRole(new Role(1, role));
        user.setIsActive(active);
        when(users.findByEmail(email)).thenReturn(Optional.of(user));
    }
}
