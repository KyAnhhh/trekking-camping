package com.trekkingcamping.backend.module.guide.service;

import com.trekkingcamping.backend.module.guide.entity.*;
import com.trekkingcamping.backend.module.guide.repository.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.*;
import com.trekkingcamping.backend.module.auth.service.PasswordResetMailer;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@Service
public class GuideInvitationService {
    public record Invite(String email) {}
    public record Acceptance(String token, String password) {}
    public record Status(String email, String status, Instant sentAt, Instant expiresAt) {}
    public record Preview(String guideName, String email, Instant expiresAt) {}
    private final GuideRepository guides;
    private final GuideInvitationRepository invitations;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final PasswordResetMailer mailer;
    private final NotificationService notifications;
    private final EntityManager em;
    public GuideInvitationService(GuideRepository guides, GuideInvitationRepository invitations, UserRepository users,
            RoleRepository roles, PasswordEncoder encoder, PasswordResetMailer mailer, NotificationService notifications, EntityManager em) {
        this.guides=guides; this.invitations=invitations; this.users=users; this.roles=roles;
        this.encoder=encoder; this.mailer=mailer; this.notifications=notifications; this.em=em;
    }
    @Transactional(readOnly=true)
    public Status status(String actor, Long id) {
        admin(actor); guides.findById(id).orElseThrow(this::invalid);
        return invitations.findById(id).map(this::status).orElse(new Status(null,"NONE",null,null));
    }
    @Transactional
    public Status send(String actor, Long id, Invite input) {
        User inviter=admin(actor);
        if(input==null || input.email()==null || input.email().trim().length()>254
                || !input.email().trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Email lời mời không hợp lệ.");
        String email=input.email().trim().toLowerCase(Locale.ROOT);
        Guide guide=lockedGuide(id);
        available(guide);
        if(users.existsByEmailIgnoreCase(email)) throw conflict("Email đã có tài khoản. Dùng Liên kết tài khoản hiện có thay vì gửi lời mời tạo mới.");
        roles.findByName("ROLE_GUIDE").orElseThrow(()->conflict("Chưa có ROLE_GUIDE. Khởi động lại backend để khởi tạo role và kiểm tra database đang kết nối."));
        mailer.requireConfigured();
        Instant now=Instant.now();
        GuideInvitation invite=invitations.findById(id).orElseGet(GuideInvitation::new);
        if(invite.getSentAt()!=null && invite.getSentAt().isAfter(now.minusSeconds(60))) throw limited();
        if(invite.getWindowStart()==null || !invite.getWindowStart().isAfter(now.minusSeconds(3600))) {
            invite.setWindowStart(now); invite.setSendsInWindow(0);
        }
        if(invite.getSendsInWindow()>=5) throw limited();
        byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes);
        String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        invite.setGuideId(id); invite.setEmail(email); invite.setTokenHash(hash(raw)); invite.setStatus("PENDING");
        invite.setSentAt(now); invite.setExpiresAt(now.plusSeconds(86400)); invite.setAcceptedAt(null);
        invite.setSendsInWindow(invite.getSendsInWindow()+1); invite.setInvitedBy(inviter.getId());
        invitations.saveAndFlush(invite);
        try { mailer.sendGuideInvitation(email,raw,guide.getFullName()); }
        catch(org.springframework.mail.MailException ex) {
            // Roll back the new digest; do not claim delivery or expose SMTP details.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa gửi được email lời mời. Kiểm tra cấu hình email rồi thử lại.");
        }
        return status(invite);
    }
    @Transactional
    public void revoke(String actor, Long id) {
        admin(actor); lockedGuide(id);
        invitations.findById(id).filter(i->"PENDING".equals(i.getStatus())).ifPresent(i->{
            i.setStatus("REVOKED"); i.setTokenHash(null); invitations.save(i);
        });
    }
    @Transactional(readOnly=true)
    public Preview preview(String token) {
        var invite=valid(token);
        var guide=guides.findById(invite.getGuideId()).orElseThrow(this::invalid);
        available(guide);
        return new Preview(guide.getFullName(),invite.getEmail(),invite.getExpiresAt());
    }
    @Transactional
    public void accept(Acceptance input) {
        if(input==null || input.password()==null || input.password().length()<8
                || input.password().getBytes(StandardCharsets.UTF_8).length>72)
            throw new IllegalArgumentException("Mật khẩu cần từ 8 ký tự và tối đa 72 byte.");
        var initial=valid(input.token());
        var guide=lockedGuide(initial.getGuideId());
        // All send/revoke/link/accept writers serialize on the guide row.
        em.refresh(initial);
        if(!Objects.equals(initial.getTokenHash(),hash(input.token())) || !usable(initial)) throw invalid();
        available(guide);
        if(users.existsByEmailIgnoreCase(initial.getEmail())) throw conflict("Email đã được đăng ký. Đăng nhập tài khoản hiện có và nhờ admin liên kết hồ sơ; lời mời không đổi mật khẩu tài khoản cũ.");
        var role=roles.findByName("ROLE_GUIDE").orElseThrow(()->conflict("Chưa có quyền hướng dẫn viên."));
        User user=new User(); user.setEmail(initial.getEmail()); user.setFullName(guide.getFullName());
        user.setPhone(guide.getPhone()); user.setRole(role); user.setPassword(encoder.encode(input.password()));
        // Reusing the email of a deleted account must not revive its old JWTs.
        user.setAuthVersion(new SecureRandom().nextLong(1L << 52)+1);
        user=users.saveAndFlush(user);
        guide.setUser(user); guides.save(guide);
        initial.setStatus("ACCEPTED"); initial.setAcceptedAt(Instant.now()); initial.setTokenHash(null); invitations.save(initial);
        notifications.emit(user,"guide-invitation:"+guide.getId(),"Chào mừng hướng dẫn viên","Tài khoản đã sẵn sàng. Đăng nhập để xem lịch dẫn đoàn được phân công.","/guide-workspace");
    }
    private User admin(String email) {
        var u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(u.getRole()==null || !Set.of("ROLE_ADMIN","ADMIN").contains(u.getRole().getName())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return u;
    }
    private Guide lockedGuide(Long id) {var g=guides.lockById(id).orElseThrow(this::invalid); em.refresh(g); return g;}
    private void available(Guide g) {if(!g.getActive() || g.getUser()!=null) throw conflict("Hồ sơ đã có tài khoản hoặc đã ngừng hoạt động.");}
    private GuideInvitation valid(String raw) {
        if(raw==null || !raw.matches("[A-Za-z0-9_-]{43}")) throw invalid();
        return invitations.findByTokenHash(hash(raw)).filter(this::usable).orElseThrow(this::invalid);
    }
    private boolean usable(GuideInvitation i) {return "PENDING".equals(i.getStatus()) && i.getExpiresAt()!=null && i.getExpiresAt().isAfter(Instant.now());}
    private Status status(GuideInvitation i) {return new Status(i.getEmail(),"PENDING".equals(i.getStatus())&&!usable(i)?"EXPIRED":i.getStatus(),i.getSentAt(),i.getExpiresAt());}
    static String hash(String raw) {
        try {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e) {throw new IllegalStateException(e);}
    }
    private ResponseStatusException invalid() {return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Lời mời không hợp lệ, đã hết hạn hoặc đã được sử dụng/thu hồi. Liên hệ admin để nhận lời mời mới.");}
    private ResponseStatusException limited() {return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Chờ ít nhất 60 giây giữa các lời mời; tối đa 5 lần mỗi giờ cho một hồ sơ.");}
    private ResponseStatusException conflict(String message) {return new ResponseStatusException(HttpStatus.CONFLICT,message);}
}
