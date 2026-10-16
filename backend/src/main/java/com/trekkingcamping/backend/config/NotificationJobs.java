package com.trekkingcamping.backend.config;
import com.trekkingcamping.backend.module.notification.service.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.data.domain.PageRequest;
import java.time.*;
@Configuration
public class NotificationJobs {
    private final NotificationDelivery delivery;private final DepartureReminder reminders;private final BookingRepository bookings;private final boolean enabled;
    private long reminderCursor=0;private LocalDate reminderDay;
    public NotificationJobs(NotificationDelivery delivery,DepartureReminder reminders,BookingRepository bookings,@Value("${NOTIFICATION_EMAIL_ENABLED:false}") boolean enabled) {
        this.delivery=delivery;this.reminders=reminders;this.bookings=bookings;this.enabled=enabled;
    }
    @Bean(name="notificationScheduler") public ThreadPoolTaskScheduler scheduler() {
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(2);scheduler.setThreadNamePrefix("notifications-");return scheduler;
    }
    @Bean(name="taskScheduler") public ThreadPoolTaskScheduler maintenanceScheduler() {
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("maintenance-");return scheduler;
    }
    @Scheduled(scheduler="notificationScheduler",initialDelay=60000,fixedDelay=30000)
    public void sendEmails() { if(enabled)for(int i=0;i<10 && delivery.sendNext();i++) { /* bounded batch */ } }
    @Scheduled(scheduler="notificationScheduler",initialDelay=60000,fixedDelay=60000)
    public void reminders() {
        var day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        if(!day.equals(reminderDay)) {reminderCursor=0;reminderDay=day;}
        var ids=bookings.reminderCandidates(reminderCursor,day,PageRequest.of(0,100));
        for(Long id:ids) {reminders.remind(id);reminderCursor=id;}
        if(ids.size()<100)reminderCursor=0;
    }
}
