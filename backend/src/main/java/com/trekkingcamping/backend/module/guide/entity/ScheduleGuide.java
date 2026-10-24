package com.trekkingcamping.backend.module.guide.entity;
import jakarta.persistence.*;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
@Entity
@Table(name = "schedule_guides", uniqueConstraints = @UniqueConstraint(columnNames = {"schedule_id", "guide_id"}),
       indexes = @Index(name = "idx_schedule_guides_guide", columnList = "guide_id"))
public class ScheduleGuide {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "schedule_id", nullable = false)
    private TourSchedule schedule;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "guide_id", nullable = false)
    private Guide guide;
    @Column(nullable = false, length = 20)
    private String role;
    @Column(nullable=false,length=20) private String responseStatus = "LEGACY";
    @Column(length=1000) private String responseReason;
    private java.time.Instant respondedAt;
    public Long getId() { return id; }
    public String getResponseStatus() { return responseStatus; }
    public String getResponseReason() { return responseReason; }
    public java.time.Instant getRespondedAt() { return respondedAt; }
    public boolean accepted() { return "ACCEPTED".equals(responseStatus)||"LEGACY".equals(responseStatus); }
    public void pending() { responseStatus="PENDING";responseReason=null;respondedAt=null; }
    public void respond(String status,String reason) { responseStatus=status;responseReason=reason;respondedAt=java.time.Instant.now(); }
    public ScheduleGuide() {}
    public ScheduleGuide(TourSchedule schedule, Guide guide, String role) { this.schedule = schedule; this.guide = guide; this.role = role; }
    public TourSchedule getSchedule() { return schedule; }
    public Guide getGuide() { return guide; }
    public String getRole() { return role; }
}

