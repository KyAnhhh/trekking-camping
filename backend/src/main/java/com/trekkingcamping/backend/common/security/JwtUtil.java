package com.trekkingcamping.backend.common.security;

import org.springframework.stereotype.Component;

/** Compatibility facade; all token operations use the same signing key. */
@Component
public class JwtUtil {
    private final JwtTokenProvider provider;
    public JwtUtil(JwtTokenProvider provider) { this.provider = provider; }
    public String generateToken(String email, String role) { return provider.generateToken(email, role); }
    public String extractEmail(String token) { return provider.getUsernameFromToken(token); }
    public boolean validateToken(String token) { return provider.validateToken(token); }
}