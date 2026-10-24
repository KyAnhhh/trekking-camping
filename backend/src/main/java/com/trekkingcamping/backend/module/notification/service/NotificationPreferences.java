package com.trekkingcamping.backend.module.notification.service;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Service
public class NotificationPreferences {
 private final JdbcTemplate jdbc;private final UserRepository users;
 public NotificationPreferences(JdbcTemplate j,UserRepository u){jdbc=j;users=u;}
 public boolean enabled(Long id){return jdbc.query("SELECT email_enabled FROM notification_preferences WHERE user_id=?",r->!r.next()||r.getBoolean(1),id);}
 public boolean get(String email){return enabled(id(email));}
 @Transactional public void save(String email,boolean enabled){jdbc.update("INSERT INTO notification_preferences(user_id,email_enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email_enabled=excluded.email_enabled",id(email),enabled);}
 private Long id(String email){return users.findByEmail(email).filter(u->Boolean.TRUE.equals(u.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED)).getId();}
}
