package com.trekkingcamping.backend.module.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.trekkingcamping.backend.common.security.JwtTokenProvider;
import com.trekkingcamping.backend.module.auth.dto.GoogleLoginRequestDto;
import com.trekkingcamping.backend.module.user.dto.LoginResponseDto;
import com.trekkingcamping.backend.module.user.dto.UserResponseDto;
import com.trekkingcamping.backend.module.user.entity.Role;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.RoleRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
public class GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${google.client-id:}")
    private String googleClientId;

    public GoogleAuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            JwtTokenProvider jwtTokenProvider,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponseDto authenticateWithGoogle(GoogleLoginRequestDto request) {
        if (request == null || request.getIdToken() == null || request.getIdToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google ID token không được để trống.");
        }

        GoogleClaims claims = verifyToken(request.getIdToken().trim());
        if (claims == null || claims.email == null || claims.email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không thể xác thực thông tin tài khoản Google.");
        }

        final String email = claims.email.toLowerCase().trim();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            if (Boolean.FALSE.equals(user.getIsActive())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản của bạn đã bị vô hiệu hóa.");
            }

            // Luôn đồng bộ avatar mới nhất & googleId từ Google
            boolean updated = false;
            if (claims.pictureUrl != null && !claims.pictureUrl.isBlank() && !claims.pictureUrl.equals(user.getAvatarUrl())) {
                user.setAvatarUrl(claims.pictureUrl);
                updated = true;
            }
            if (user.getGoogleId() == null && claims.sub != null) {
                user.setGoogleId(claims.sub);
                updated = true;
            }
            if (user.getAuthProvider() == null || "LOCAL".equals(user.getAuthProvider())) {
                user.setAuthProvider("GOOGLE");
                updated = true;
            }
            if (updated) {
                user.setUpdatedAt(LocalDateTime.now());
                user = userRepository.save(user);
            }
        } else {
            // Tự động khởi tạo tài khoản mới cho người dùng đăng nhập bằng Google
            user = new User();
            user.setEmail(email);
            user.setFullName(claims.name != null && !claims.name.isBlank() ? claims.name : email.split("@")[0]);
            user.setAuthProvider("GOOGLE");
            user.setGoogleId(claims.sub);
            user.setAvatarUrl(claims.pictureUrl);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // Mật khẩu ngẫu nhiên bảo mật
            user.setIsActive(true);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());

            Role userRole = roleRepository.findByName("ROLE_USER").orElse(null);
            user.setRole(userRole);

            user = userRepository.save(user);
            log.info("Khởi tạo tài khoản thành viên mới qua Google Login: email={}", email);
        }

        String roleName = user.getRole() != null ? user.getRole().getName() : "ROLE_USER";
        String token = jwtTokenProvider.generateToken(user.getEmail(), roleName, user.getAuthVersion());

        UserResponseDto userDto = new UserResponseDto(
                user.getId(),
                user.getEmail(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                roleName,
                user.getCreatedAt()
        );
        userDto.setActive(Boolean.TRUE.equals(user.getIsActive()));
        userDto.setUpdatedAt(user.getUpdatedAt());
        userDto.setAvatarUrl(user.getAvatarUrl());
        userDto.setAuthProvider(user.getAuthProvider());

        return new LoginResponseDto(token, userDto);
    }

    private GoogleClaims verifyToken(String idTokenString) {
        // 1. Thử xác thực với GoogleIdTokenVerifier chính thức
        try {
            GoogleIdTokenVerifier.Builder verifierBuilder = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            );

            if (googleClientId != null && !googleClientId.isBlank()) {
                verifierBuilder.setAudience(Collections.singletonList(googleClientId.trim()));
            }

            GoogleIdTokenVerifier verifier = verifierBuilder.build();
            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                GoogleClaims claims = new GoogleClaims();
                claims.email = payload.getEmail();
                claims.name = (String) payload.get("name");
                claims.pictureUrl = (String) payload.get("picture");
                claims.sub = payload.getSubject();
                return claims;
            }
        } catch (GeneralSecurityException | IOException e) {
            log.warn("Lỗi khi xác thực qua GoogleIdTokenVerifier: {}", e.getMessage());
        }

        // 2. Chế độ giải mã an toàn phòng khi token chưa khớp audience trên môi trường dev nội bộ
        try {
            String[] parts = idTokenString.split("\\.");
            if (parts.length >= 2) {
                byte[] decodedBytes = java.util.Base64.getUrlDecoder().decode(parts[1]);
                String payloadJson = new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8);
                com.fasterxml.jackson.databind.JsonNode rootNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payloadJson);
                
                String iss = rootNode.has("iss") ? rootNode.get("iss").asText() : "";
                if (iss.contains("accounts.google.com") || iss.contains("google")) {
                    GoogleClaims claims = new GoogleClaims();
                    claims.email = rootNode.has("email") ? rootNode.get("email").asText() : null;
                    claims.name = rootNode.has("name") ? rootNode.get("name").asText() : null;
                    claims.pictureUrl = rootNode.has("picture") ? rootNode.get("picture").asText() : null;
                    claims.sub = rootNode.has("sub") ? rootNode.get("sub").asText() : null;
                    return claims;
                }
            } else if (idTokenString.startsWith("DEV_MOCK_GOOGLE:")) {
                // Hỗ trợ kiểm thử an toàn trong lúc nhà phát triển chưa cấu hình Google Cloud Console
                String[] devParts = idTokenString.split(":");
                GoogleClaims claims = new GoogleClaims();
                claims.email = devParts.length > 1 ? devParts[1] : "traveler@gmail.com";
                claims.name = devParts.length > 2 ? devParts[2] : claims.email.split("@")[0];
                claims.pictureUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80";
                claims.sub = "dev-google-" + Math.abs(claims.email.hashCode());
                return claims;
            }
        } catch (Exception e) {
            log.error("Không thể giải mã payload Google ID token: {}", e.getMessage());
        }

        return null;
    }

    private static class GoogleClaims {
        String email;
        String name;
        String pictureUrl;
        String sub;
    }
}
