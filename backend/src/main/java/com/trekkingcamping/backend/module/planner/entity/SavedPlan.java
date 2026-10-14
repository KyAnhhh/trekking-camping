package com.trekkingcamping.backend.module.planner.entity;
import jakarta.persistence.*;
import com.trekkingcamping.backend.module.user.entity.User;
import java.time.Instant;
@Entity
@Table(name = "saved_plans", indexes = @Index(name = "idx_saved_plans_owner_created", columnList = "user_id,created_at"))
public class SavedPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public User getUser() { return user; } public void setUser(User value) { user = value; }
    public String getTitle() { return title; } public void setTitle(String value) { title = value; }
    public String getContent() { return content; } public void setContent(String value) { content = value; }
    public Instant getCreatedAt() { return createdAt; }
}
