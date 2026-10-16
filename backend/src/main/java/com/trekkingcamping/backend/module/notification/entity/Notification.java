package com.trekkingcamping.backend.module.notification.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import com.trekkingcamping.backend.module.user.entity.User;

@Entity @Table(name="notifications", uniqueConstraints=@UniqueConstraint(columnNames={"user_id","event_key"}),
    indexes={@Index(name="idx_notifications_owner",columnList="user_id,created_at"),@Index(name="idx_notifications_mail",columnList="email_status,next_attempt_at")})
@Getter @Setter
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(name="event_key",nullable=false,length=200) private String eventKey;
    @Column(nullable=false,length=180) private String title;
    @Column(nullable=false,length=1000) private String body;
    @Column(nullable=false,length=200) private String link;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    private Instant readAt;
    @Column(name="email_status",nullable=false,length=20) private String emailStatus;
    @Column(nullable=false) private int attempts;
    @Column(name="next_attempt_at",nullable=false) private Instant nextAttemptAt;
    private Instant sentAt;
}
