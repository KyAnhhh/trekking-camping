package com.trekkingcamping.backend.module.notification.service;
import com.trekkingcamping.backend.module.notification.repository.NotificationRepository;
import com.trekkingcamping.backend.module.auth.service.PasswordResetMailer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
@Service
public class NotificationDelivery {
    private final NotificationRepository repository;private final PasswordResetMailer mailer;
    public NotificationDelivery(NotificationRepository repository,PasswordResetMailer mailer) {this.repository=repository;this.mailer=mailer;}
    @Transactional public boolean sendNext() {
        var row=repository.nextMail(Instant.now()).orElse(null);if(row==null)return false;
        if(!Boolean.TRUE.equals(row.getUser().getIsActive())) {row.setEmailStatus("SKIPPED");return true;}
        row.setAttempts(row.getAttempts()+1);
        try {
            mailer.sendNotification(row.getUser().getEmail(),row.getTitle(),row.getBody(),row.getLink());
            row.setEmailStatus("SENT");row.setSentAt(Instant.now());
        } catch(RuntimeException e) {
            row.setEmailStatus(row.getAttempts()>=5?"FAILED":"RETRY");
            row.setNextAttemptAt(Instant.now().plusSeconds(60L << Math.min(row.getAttempts(),8)));
            // Do not log exception text: SMTP errors can contain recipient addresses and credentials.
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Notification {} email attempt {} failed",row.getId(),row.getAttempts());
        }
        return true;
    }
}
