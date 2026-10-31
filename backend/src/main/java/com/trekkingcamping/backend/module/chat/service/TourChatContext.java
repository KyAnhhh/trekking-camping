package com.trekkingcamping.backend.module.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

/** Public catalog only. No booking, contact or customer data is sent to the model. */
@Service
public class TourChatContext {
    private final TourRepository tours;
    private final TourScheduleRepository schedules;
    private final ObjectMapper json;
    public record Snapshot(Set<String> tourIds, String text) {}

    public TourChatContext(TourRepository tours, TourScheduleRepository schedules, ObjectMapper json) {
        this.tours = tours;
        this.schedules = schedules;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Snapshot current() {
        var active = tours.findByIsActiveTrueOrderByIdAsc(PageRequest.of(0, 31));
        boolean limited = active.size() > 30;
        active = active.stream().limit(30).toList();
        var ids = active.stream().map(t -> t.getId()).toList();
        var upcoming = ids.isEmpty() ? List.<com.trekkingcamping.backend.module.tour.entity.TourSchedule>of()
                : schedules.findByTourIdInAndDepartureDateAfterOrderByDepartureDateAsc(ids, LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        var rows = new ArrayList<Map<String, Object>>();
        for (var tour : active) {
            var open = upcoming.stream().filter(s -> Objects.equals(s.getTour().getId(), tour.getId()))
                    .filter(s -> "OPEN".equals(s.getStatus()) && s.getAvailableSlots() != null && s.getAvailableSlots() > 0)
                    .toList();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("tourId", tour.getId()); row.put("title", tour.getTitle());
            row.put("url", "/tours/" + tour.getSlug()); row.put("location", tour.getLocation());
            row.put("bannerUrl", tour.getBannerUrl());
            row.put("difficulty", tour.getDifficultyLevel()); row.put("days", tour.getDurationDays());
            row.put("adventureProfile",tour.getAdventureProfile());
            row.put("nights", tour.getDurationNights()); row.put("pricePerPaxVnd", tour.getPricePerPax());
            row.put("moreSchedules", open.size() > 3);
            row.put("schedules", open.stream().limit(3).map(s -> Map.of(
                    "id", s.getId(), "departure", s.getDepartureDate().toString(),
                    "returnDate", Objects.toString(s.getReturnDate(), ""), "availableSlots", s.getAvailableSlots())).toList());
            rows.add(row);
        }
        try {
            return new Snapshot(new HashSet<>(ids.stream().map(String::valueOf).toList()),
                    "Dữ liệu công khai đọc từ DB tại thời điểm hỏi; không giữ chỗ. Giới hạn danh sách: " + limited
                    + ". Mỗi tour tối đa 3 lịch gần nhất. schedules rỗng nghĩa là chưa có lịch còn chỗ để đặt.\n" + json.writeValueAsString(rows));
        } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot serialize public tour catalog", e); }
    }
}
