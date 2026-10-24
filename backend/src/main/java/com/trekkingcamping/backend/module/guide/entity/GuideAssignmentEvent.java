package com.trekkingcamping.backend.module.guide.entity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="guide_assignment_events")
public class GuideAssignmentEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long scheduleId;
 @Column(nullable=false) private Long guideId;
 @Column(nullable=false,length=254) private String actor;
 @Column(nullable=false,length=30) private String action;
 @Column(length=1000) private String reason;
 @Column(nullable=false) private Instant createdAt=Instant.now();
 public GuideAssignmentEvent() {}
 public GuideAssignmentEvent(Long scheduleId,Long guideId,String actor,String action,String reason) {
  this.scheduleId=scheduleId;this.guideId=guideId;this.actor=actor;this.action=action;this.reason=reason;
 }
}
