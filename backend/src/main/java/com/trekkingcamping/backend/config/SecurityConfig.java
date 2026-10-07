package com.trekkingcamping.backend.config;

import com.trekkingcamping.backend.common.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 1. Preflight CORS requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 2. Public API Chatbot & Auth
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register", "/api/chat").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                // The gateway authenticates this callback with HMAC, not a user's JWT.
                .requestMatchers(HttpMethod.POST, "/api/payments/momo/ipn").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/payments/vnpay/return").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tours", "/api/tours/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/media/tours/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/guides/*", "/api/media/guides/*").permitAll()
                .requestMatchers("/api/tours/**", "/api/tours", "/api/chat/ingest-tours", "/api/admin/**", "/api/users/**", "/api/users").hasRole("ADMIN")
                .requestMatchers("/api/bookings/**").authenticated()
                
                // 3. Admin API: Bắt buộc phải có Role ADMIN
                .requestMatchers("/api/admin/knowledge/**").hasAnyAuthority("ROLE_ADMIN", "ADMIN")

                // 4. Bất kỳ request nào khác bắt buộc phải đăng nhập
                .anyRequest().authenticated()
            )
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"code\":401,\"message\":\"Vui lòng đăng nhập để tiếp tục.\",\"data\":null}");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"code\":403,\"message\":\"Bạn không có quyền thực hiện thao tác này.\",\"data\":null}");
                }))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Chỉ định rõ các domain Client được phép gọi API (tránh dùng "*")
        configuration.setAllowedOrigins(List.of(
            "http://localhost:5173", // URL Vite
            "http://localhost:3000"  // URL React
        ));

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
}
