package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class TourComparisonService {

    public record TourComparisonItem(
        Long tourId,
        String title,
        String slug,
        String bannerUrl,
        String location,
        BigDecimal pricePerPax,
        int difficultyLevel,
        String difficultyLabel,
        Integer durationDays,
        Integer maxAltitudeM,
        BigDecimal distanceKm,
        BigDecimal activeHoursPerDay,
        String terrainType,
        String campCondition,
        String highlights,
        String suitableFor,
        Long nextScheduleId
    ) {}

    public record TourComparisonCard(
        String title,
        String verdict,
        TourComparisonItem tourA,
        TourComparisonItem tourB,
        List<String> quickPills
    ) {}

    public record TimelineMilestone(
        String time,
        String title,
        String desc,
        String iconType, // "START", "LUNCH", "CAMP", "SUMMIT", "TREK", "REST"
        Integer altitudeM,
        String distanceNotice
    ) {}

    public record TimelineDay(
        int dayNumber,
        String title,
        String summary,
        List<TimelineMilestone> milestones
    ) {}

    public record TourTimelineCard(
        Long tourId,
        String title,
        String slug,
        String location,
        Integer durationDays,
        Integer maxAltitudeM,
        BigDecimal distanceKm,
        List<TimelineDay> days,
        List<String> quickPills
    ) {}

    private final TourRepository tours;
    private final TourScheduleRepository schedules;
    private final TourItineraryRepository itineraries;

    public TourComparisonService(TourRepository tours, TourScheduleRepository schedules, TourItineraryRepository itineraries) {
        this.tours = tours;
        this.schedules = schedules;
        this.itineraries = itineraries;
    }

    @Transactional(readOnly = true)
    public TourComparisonCard compareTours(String tourAQuery, String tourBQuery) {
        var allTours = tours.findByIsActiveTrue();
        if (allTours.isEmpty()) return null;

        Tour tourA = findMatchingTour(tourAQuery, allTours);
        Tour tourB = findMatchingTour(tourBQuery, allTours);

        // If tourA not found, pick the first active tour
        if (tourA == null) {
            tourA = allTours.get(0);
        }

        // If tourB not found or matches tourA, pick a contrasting tour
        if (tourB == null || Objects.equals(tourA.getId(), tourB.getId())) {
            final Long firstId = tourA.getId();
            tourB = allTours.stream()
                .filter(t -> !Objects.equals(t.getId(), firstId))
                .findFirst()
                .orElse(tourA);
        }

        TourComparisonItem itemA = buildComparisonItem(tourA);
        TourComparisonItem itemB = buildComparisonItem(tourB);

        String verdict = generateComparisonVerdict(itemA, itemB);

        List<String> pills = new ArrayList<>();
        pills.add("Đặt tour " + itemA.title() + " cho 2 người");
        pills.add("Lịch trình chi tiết " + itemA.title());
        pills.add("Lịch trình chi tiết " + itemB.title());

        String cardTitle = "So sánh đối chiếu: " + itemA.title() + " vs " + itemB.title();
        return new TourComparisonCard(cardTitle, verdict, itemA, itemB, pills);
    }

    @Transactional(readOnly = true)
    public TourTimelineCard getTourTimeline(String destinationQuery) {
        var allTours = tours.findByIsActiveTrue();
        if (allTours.isEmpty()) return null;

        Tour tour = findMatchingTour(destinationQuery, allTours);
        if (tour == null) tour = allTours.get(0);

        var dbItineraries = itineraries.findByTourIdOrderByDayNumberAsc(tour.getId());
        List<TimelineDay> days = new ArrayList<>();

        if (!dbItineraries.isEmpty()) {
            for (var dbIt : dbItineraries) {
                int dayNum = dbIt.getDayNumber() != null ? dbIt.getDayNumber() : (days.size() + 1);
                days.add(parseItineraryToTimelineDay(dayNum, dbIt.getTitle(), dbIt.getDescription(), tour));
            }
        } else {
            days = generateFallbackTimelineDays(tour);
        }

        var profile = tour.getAdventureProfile();
        Integer maxAlt = profile != null ? profile.getMaxAltitudeM() : estimateAltitude(tour.getTitle(), tour.getLocation());
        BigDecimal dist = profile != null ? profile.getDistanceKm() : BigDecimal.valueOf(tour.getDurationDays() * 12L);

        List<String> pills = new ArrayList<>();
        pills.add("Cần chuẩn bị đồ gì cho " + tour.getTitle() + "?");
        pills.add("So sánh " + tour.getTitle() + " với cung đường khác");
        pills.add("Đặt tour này cho 2 người vào tháng tới");

        return new TourTimelineCard(
            tour.getId(),
            "Lịch trình dòng thời gian: " + tour.getTitle(),
            tour.getSlug(),
            tour.getLocation(),
            tour.getDurationDays(),
            maxAlt,
            dist,
            days,
            pills
        );
    }

    private Tour findMatchingTour(String query, List<Tour> allTours) {
        if (query == null || query.isBlank()) return null;
        String q = query.toLowerCase(Locale.ROOT).trim();

        // Exact match slug or contains
        for (var t : allTours) {
            String title = t.getTitle() == null ? "" : t.getTitle().toLowerCase(Locale.ROOT);
            String loc = t.getLocation() == null ? "" : t.getLocation().toLowerCase(Locale.ROOT);
            String slug = t.getSlug() == null ? "" : t.getSlug().toLowerCase(Locale.ROOT);

            if (title.contains(q) || loc.contains(q) || slug.contains(q) || q.contains(title) || q.contains(slug)) {
                return t;
            }
        }

        // Token match
        String[] tokens = q.split("[\\s,;\\-]+");
        for (var t : allTours) {
            String title = t.getTitle() == null ? "" : t.getTitle().toLowerCase(Locale.ROOT);
            for (String tok : tokens) {
                if (tok.length() > 2 && title.contains(tok)) return t;
            }
        }
        return null;
    }

    private TourComparisonItem buildComparisonItem(Tour t) {
        var profile = t.getAdventureProfile();
        int diff = t.getDifficultyLevel() != null ? t.getDifficultyLevel() : 2;
        String diffLabel = switch (diff) {
            case 1 -> "Level 1: Dễ / Người mới bắt đầu";
            case 2 -> "Level 2: Vừa phải / Thể lực khá";
            default -> "Level 3: Thử thách / Dốc gắt";
        };

        Integer maxAlt = profile != null ? profile.getMaxAltitudeM() : estimateAltitude(t.getTitle(), t.getLocation());
        BigDecimal dist = profile != null ? profile.getDistanceKm() : BigDecimal.valueOf(t.getDurationDays() * 12L);
        BigDecimal activeHours = profile != null ? profile.getActiveHoursPerDay() : BigDecimal.valueOf(6.5);

        String terrain = determineTerrain(t.getTitle(), t.getLocation());
        String camp = determineCamp(t.getTitle(), t.getLocation());
        String highlights = determineHighlights(t.getTitle(), t.getLocation());
        String suitableFor = switch (diff) {
            case 1 -> "Người mới trekking lần đầu, gia đình và nhóm bạn dã ngoại nhẹ";
            case 2 -> "Người có thể lực khá, thích trải nghiệm leo núi và cắm trại thiên nhiên";
            default -> "Trekker dã ngoại giàu kinh nghiệm, sức bền dẻo dai thích mạo hiểm";
        };

        Long nextScheduleId = findNextOpenSchedule(t.getId());

        return new TourComparisonItem(
            t.getId(),
            t.getTitle(),
            t.getSlug(),
            t.getBannerUrl(),
            t.getLocation(),
            t.getPricePerPax(),
            diff,
            diffLabel,
            t.getDurationDays(),
            maxAlt,
            dist,
            activeHours,
            terrain,
            camp,
            highlights,
            suitableFor,
            nextScheduleId
        );
    }

    private Long findNextOpenSchedule(Long tourId) {
        try {
            var open = schedules.findByTourIdInAndDepartureDateAfterOrderByDepartureDateAsc(
                List.of(tourId),
                LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))
            );
            return open.stream()
                .filter(s -> "OPEN".equals(s.getStatus()) && s.getAvailableSlots() != null && s.getAvailableSlots() > 0)
                .map(TourSchedule::getId)
                .findFirst()
                .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private String generateComparisonVerdict(TourComparisonItem a, TourComparisonItem b) {
        if (a.difficultyLevel() < b.difficultyLevel()) {
            return "Nếu bạn là người mới đi lần đầu và muốn một chuyến dã ngoại an toàn, **" + a.title() + "** là lựa chọn lý tưởng. Ngược lại, nếu bạn muốn thử thách sức bền trên cung đường dốc hùng vĩ, hãy chọn **" + b.title() + "**.";
        } else if (a.difficultyLevel() > b.difficultyLevel()) {
            return "**" + a.title() + "** mang lại độ phấn khích và thử thách thể lực cao hơn. Nếu bạn thích hành trình êm ả và thư thái ngắm cảnh, **" + b.title() + "** sẽ phù hợp hơn.";
        } else {
            return "Cả hai cung đều có cấp độ thể lực tương đương. **" + a.title() + "** nổi bật với cảnh sắc " + a.highlights() + ", trong khi **" + b.title() + "** đem lại trải nghiệm " + b.highlights() + ".";
        }
    }

    private TimelineDay parseItineraryToTimelineDay(int dayNum, String title, String desc, Tour tour) {
        String cleanTitle = title != null && !title.isBlank() ? title : "Ngày " + dayNum + ": Khám phá hành trình";
        String cleanDesc = desc != null ? desc : "";

        List<TimelineMilestone> milestones = new ArrayList<>();
        var profile = tour.getAdventureProfile();
        int baseAlt = 1200 + (dayNum * 500);
        if (profile != null && profile.getMaxAltitudeM() != null) {
            baseAlt = Math.min(profile.getMaxAltitudeM(), 800 + (dayNum * 700));
        }

        if (dayNum == 1) {
            milestones.add(new TimelineMilestone("07:30", "Tập kết & Khởi hành chặng đầu", "Gặp gỡ Guide, kiểm tra trang bị gậy trek, balo trợ lực và khởi động.", "START", baseAlt - 400, "Cự ly: 3.5 km"));
            milestones.add(new TimelineMilestone("11:30", "Ăn trưa & Nạp năng lượng giữa rừng", "Nghỉ ngơi bên bóng mát, dùng bữa trưa dã ngoại và bù nước khoáng điện giải.", "LUNCH", baseAlt - 150, "Độ dốc trung bình 15%"));
            milestones.add(new TimelineMilestone("16:30", "Đến trạm dừng chân & Hạ trại đêm", "Dựng lều, chuẩn bị tiệc nướng BBQ ấm cúng và ngắm hoàng hôn buông xuống núi rừng.", "CAMP", baseAlt, "Điểm cắm trại đêm ⛺"));
        } else if (dayNum == tour.getDurationDays()) {
            milestones.add(new TimelineMilestone("05:00", "Đón bình minh & Chinh phục đỉnh (Summit)", "Xuất phát sớm đón những tia nắng đầu tiên và biển mây cuồn cuộn trên đỉnh.", "SUMMIT", baseAlt + 300, "Khoảnh khắc đỉnh cao 🚩"));
            milestones.add(new TimelineMilestone("11:30", "Dùng bữa trưa & Thu dọn hành trang", "Thu gom rác tuân thủ chuẩn Leave No Trace (LNT), chuẩn bị đổ dốc.", "LUNCH", baseAlt, "Nghỉ ngơi 45 phút"));
            milestones.add(new TimelineMilestone("15:30", "Về điểm tập kết & Kết thúc chuyến đi", "Xe trung chuyển đón đoàn, trao giấy chứng nhận chinh phục và chào tạm biệt.", "REST", 600, "Hoàn tất hành trình ✅"));
        } else {
            milestones.add(new TimelineMilestone("07:00", "Bắt đầu hành trình ngày mới", "Khởi động sớm, thưởng thức cà phê sáng và bước vào cung rừng nguyên sinh.", "START", baseAlt - 200, "Cự ly: 5.0 km"));
            milestones.add(new TimelineMilestone("12:00", "Bữa trưa dã ngoại ven suối", "Dừng chân nghỉ ngơi, chụp ảnh check-in và bổ sung năng lượng calo.", "LUNCH", baseAlt, "Đường mòn thoáng"));
            milestones.add(new TimelineMilestone("17:00", "Hạ trại đêm thứ " + dayNum, "Nhóm lửa trại, giao lưu cùng hướng dẫn viên bản địa dưới bầu trời sao.", "CAMP", baseAlt + 100, "Khu cắm trại qua đêm ⛺"));
        }

        return new TimelineDay(dayNum, cleanTitle, cleanDesc, milestones);
    }

    private List<TimelineDay> generateFallbackTimelineDays(Tour tour) {
        int days = tour.getDurationDays() != null && tour.getDurationDays() > 0 ? tour.getDurationDays() : 2;
        List<TimelineDay> result = new ArrayList<>();
        for (int i = 1; i <= days; i++) {
            result.add(parseItineraryToTimelineDay(i, "Ngày " + i + ": Chinh phục " + tour.getTitle(), "Hành trình vượt dốc và trải nghiệm thiên nhiên nguyên sơ.", tour));
        }
        return result;
    }

    private Integer estimateAltitude(String title, String location) {
        String combined = (title + " " + location).toLowerCase(Locale.ROOT);
        if (combined.contains("fansipan")) return 3143;
        if (combined.contains("bạch mộc") || combined.contains("bach moc") || combined.contains("muối")) return 3046;
        if (combined.contains("putaleng")) return 3049;
        if (combined.contains("lảo thẩn") || combined.contains("lao than")) return 2860;
        if (combined.contains("tà xùa")) return 2865;
        if (combined.contains("bidoup")) return 2287;
        if (combined.contains("tà năng") || combined.contains("phan dũng")) return 1100;
        if (combined.contains("đà lạt")) return 1500;
        return 1200;
    }

    private String determineTerrain(String title, String location) {
        String combined = (title + " " + location).toLowerCase(Locale.ROOT);
        if (combined.contains("fansipan")) return "Bậc thang gỗ, vách đá có tay vịn, đường mòn rõ";
        if (combined.contains("bạch mộc") || combined.contains("bach moc")) return "Vách đá sống lưng khủng long, dốc gắt liên tục";
        if (combined.contains("tà năng") || combined.contains("phan dũng")) return "Đồi cỏ dốc trập trùng, đường đất đỏ, lội suối cạn";
        if (combined.contains("bidoup")) return "Rừng rậm nguyên sinh, cây thông cổ thụ, leo dốc rừng ẩm";
        if (combined.contains("cát tiên")) return "Rừng mưa nhiệt đới bằng phẳng ven sông Đồng Nai";
        return "Đường mòn tự nhiên rừng núi, dốc thoai thoải";
    }

    private String determineCamp(String title, String location) {
        String combined = (title + " " + location).toLowerCase(Locale.ROOT);
        if (combined.contains("fansipan")) return "Lán gỗ 2.800m khép kín, có điện mặt trời nhẹ";
        if (combined.contains("bạch mộc")) return "Lán gỗ 2.100m mộc mạc trên đồi Muối săn mây";
        if (combined.contains("tà năng")) return "Dựng lều cắm trại trên đỉnh đồi cỏ lộng gió";
        if (combined.contains("bidoup")) return "Lán trạm kiểm lâm 2.000m ấm cúng";
        return "Khu cắm trại dã ngoại thiên nhiên thoáng mát";
    }

    private String determineHighlights(String title, String location) {
        String combined = (title + " " + location).toLowerCase(Locale.ROOT);
        if (combined.contains("fansipan")) return "Chinh phục đỉnh 3.143m - Nóc nhà Đông Dương";
        if (combined.contains("bạch mộc")) return "Thiên đường săn biển mây đồi Muối đẹp nhất VN";
        if (combined.contains("tà năng")) return "Hoàng hôn đồi cỏ và ngắm dải ngân hà Milky Way";
        if (combined.contains("bidoup")) return "Hệ sinh thái rừng rêu ma mị và rừng thông ngút ngàn";
        return "Hòa mình cùng thiên nhiên nguyên sơ và lửa trại ấm áp";
    }
}
