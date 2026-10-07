package com.trekkingcamping.backend.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {
    private final SecretKey signingKey;

    public JwtTokenProvider(@org.springframework.beans.factory.annotation.Value("${jwt.secret:}") String secret) {
        if (secret == null || secret.isBlank()) {
            signingKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
            org.slf4j.LoggerFactory.getLogger(JwtTokenProvider.class).warn("JWT_SECRET is not configured; tokens expire when the server restarts. Configure a stable secret before deployment.");
        } else {
            signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }
    }
    private final long JWT_EXPIRATION = 86400000L; // 24 giờ (ms)

    private SecretKey getSigningKey() {
        return signingKey;
    }

    // 1. Tạo JWT Token chứa Username và Role
    public String generateToken(String username, String role) {
        return generateToken(username, role, 0L);
    }

    public String generateToken(String username, String role, long authVersion) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);

        return Jwts.builder()
                .setSubject(username)
                .claim("role", role) // Đóng gói Role vào Claim của JWT
                .claim("authVersion", authVersion)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Overload giữ tương thích code cũ nếu chỉ truyền username (Mặc định ROLE_USER)
    public String generateToken(String username) {
        return generateToken(username, "ROLE_USER");
    }

    // 2. Trích xuất Username từ JWT Token
    public String getUsernameFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getSubject();
    }

    // 3. Trích xuất Role từ JWT Token
    public String getRoleFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("role", String.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean matchesAuthVersion(String token, long authVersion) {
        Number version = getClaims(token).get("authVersion", Number.class);
        // Existing tokens without a version behave as version zero until first revocation.
        return (version == null ? 0L : version.longValue()) == authVersion;
    }

    // 4. Kiểm tra Token hợp lệ
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Invalid or expired credentials are handled by the security entry point.
        }
        return false;
    }
}
