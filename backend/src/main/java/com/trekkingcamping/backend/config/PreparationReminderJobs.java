package com.trekkingcamping.backend.config;
import com.trekkingcamping.backend.module.notification.service.PreparationReminders;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
@Component
public class PreparationReminderJobs {
 private final PreparationReminders service;private long cursor;
 public PreparationReminderJobs(PreparationReminders service){this.service=service;}
 @Scheduled(scheduler="notificationScheduler",initialDelay=120000,fixedDelay=60000)
 public void run(){var ids=service.candidates(cursor);for(Long id:ids){service.remind(id);cursor=id;}if(ids.size()<100)cursor=0;}
}
