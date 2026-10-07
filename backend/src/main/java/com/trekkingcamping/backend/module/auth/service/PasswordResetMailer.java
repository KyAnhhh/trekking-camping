package com.trekkingcamping.backend.module.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;

@Service
public class PasswordResetMailer {
    private final JavaMailSenderImpl sender;
    private final String from;
    private final String frontendUrl;

    public PasswordResetMailer(@Value("${MAIL_HOST:}") String host,
            @Value("${MAIL_PORT:587}") int port, @Value("${MAIL_USERNAME:}") String username,
            @Value("${MAIL_PASSWORD:}") String password, @Value("${MAIL_FROM:}") String from,
            @Value("${APP_FRONTEND_URL:http://localhost:5173}") String frontendUrl) {
        this.from = from; this.frontendUrl = frontendUrl;
        sender = new JavaMailSenderImpl(); sender.setHost(host); sender.setPort(port);
        sender.setUsername(username); sender.setPassword(password); sender.setDefaultEncoding("UTF-8");
        var properties = sender.getJavaMailProperties();
        properties.setProperty("mail.smtp.auth", "true");
        properties.setProperty("mail.smtp.starttls.enable", "true");
        properties.setProperty("mail.smtp.starttls.required", "true");
        properties.setProperty("mail.smtp.ssl.checkserveridentity", "true");
        properties.setProperty("mail.smtp.connectiontimeout", "5000");
        properties.setProperty("mail.smtp.timeout", "5000");
        properties.setProperty("mail.smtp.writetimeout", "5000");
    }

    public void requireConfigured() {
        try {
            var url = URI.create(frontendUrl);
            if (sender.getHost() == null || sender.getHost().isBlank() || sender.getUsername().isBlank()
                    || sender.getPassword().isBlank() || !from.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                    || url.getHost() == null || url.getUserInfo() != null || url.getQuery() != null || url.getFragment() != null
                    || !("https".equals(url.getScheme()) || ("http".equals(url.getScheme())
                        && java.util.Set.of("localhost", "127.0.0.1").contains(url.getHost())))) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        }
    }

    public void sendResetLink(String email, String token) {
        requireConfigured();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from); message.setTo(email); message.setSubject("Trek & Camp - Đặt lại mật khẩu");
        // Fragment keeps the credential out of HTTP request URLs and referrers.
        message.setText("Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực 15 phút và chỉ dùng một lần:\n\n"
                + frontendUrl.replaceAll("/+$", "") + "/reset-password#token=" + token
                + "\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.");
        sender.send(message);
    }
}
