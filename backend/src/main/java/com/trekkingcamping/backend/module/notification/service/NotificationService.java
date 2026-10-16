package com.trekkingcamping.backend.module.notification.service;

import com.trekkingcamping.backend.module.notification.repository.NotificationRepository;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    public record Item(Long id,String title,String body,String link,Instant createdAt,Instant readAt) {}
    public record Inbox(List<Item> items,long unread,int page,int totalPages,long totalElements) {}
    private final NotificationRepository repository;private final UserRepository users;private final JdbcTemplate jdbc;
    private final boolean emailEnabled;
    public NotificationService(NotificationRepository repository,UserRepository users,JdbcTemplate jdbc,
            @Value("${NOTIFICATION_EMAIL_ENABLED:false}") boolean emailEnabled) {
        this.repository=repository;this.users=users;this.jdbc=jdbc;this.emailEnabled=emailEnabled;
    }
    // Called inside the business transaction: either both the event and change commit, or neither does.
    @Transactional(propagation=Propagation.MANDATORY)
    public void emit(User recipient,String key,String title,String body,String link) {
        if(recipient==null || recipient.getId()==null)throw new IllegalArgumentException("Thiếu người nhận thông báo.");
        jdbc.update("""
            insert into notifications(user_id,event_key,title,body,link,created_at,email_status,attempts,next_attempt_at)
            values (?,?,?,?,?,CURRENT_TIMESTAMP,?,0,CURRENT_TIMESTAMP)
            on conflict(user_id,event_key) do nothing
            """,recipient.getId(),key,title,body,link,emailEnabled?"PENDING":"SKIPPED");
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void booking(Booking b,String event,String title,String message) {
        emit(b.getUser(),"booking:"+b.getId()+":"+event,title,"Đơn "+b.getBookingCode()+". "+message,"/my-bookings/"+b.getId());
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void administrators(Booking b,String event,String title) {
        for(var admin:users.findByRoleNameAndIsActiveTrue("ROLE_ADMIN"))
            emit(admin,"admin-booking:"+b.getId()+":"+event,title,"Đơn "+b.getBookingCode()+" cần kiểm tra trong trang quản trị.","/admin/bookings/"+b.getId());
    }
    @Transactional(readOnly=true)
    public Inbox inbox(String email,int page) {
        var u=user(email);if(page<0 || page>10000)throw new IllegalArgumentException("Trang không hợp lệ.");
        var rows=repository.findByUserIdOrderByIdDesc(u.getId(),PageRequest.of(page,20));
        return new Inbox(rows.stream().map(n->new Item(n.getId(),n.getTitle(),n.getBody(),n.getLink(),n.getCreatedAt(),n.getReadAt())).toList(),
            repository.countByUserIdAndReadAtIsNull(u.getId()),page,rows.getTotalPages(),rows.getTotalElements());
    }
    @Transactional(readOnly=true) public long unread(String email) { return repository.countByUserIdAndReadAtIsNull(user(email).getId()); }
    @Transactional public void read(String email,Long id) { repository.read(id,user(email).getId(),Instant.now()); }
    @Transactional public void readAll(String email) { repository.readAll(user(email).getId(),Instant.now()); }
    private User user(String email) {
        return users.findByEmail(email).filter(u->Boolean.TRUE.equals(u.getIsActive()))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
