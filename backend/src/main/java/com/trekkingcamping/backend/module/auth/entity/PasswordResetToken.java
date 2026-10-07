package com.trekkingcamping.backend.module.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import com.trekkingcamping.backend.module.user.entity.User;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant expiresAt;
    @Column(nullable = false) private boolean used;
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}
