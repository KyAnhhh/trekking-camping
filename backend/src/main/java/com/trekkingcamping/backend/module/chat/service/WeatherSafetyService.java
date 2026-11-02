package com.trekkingcamping.backend.module.chat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WeatherSafetyService {

    private static final Logger log = LoggerFactory.getLogger(WeatherSafetyService.class);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public record WeatherMetric(
        String label,
        String value,
        String subtext,
        String iconType // "BASE_TEMP", "SUMMIT_TEMP", "RAIN", "WIND", "CLOUD", "HUMIDITY"
    ) {}

    public record SafetyAlert(
        String severity, // "INFO", "CAUTION", "DANGER"
        String title,
        String message
    ) {}

    public record TourWeatherSafetyCard(
        Long tourId,
        String tourTitle,
        String slug,
        String destination,
        Integer maxAltitudeM,
        String forecastTime,
        String safetyStatus, // "FAVORABLE", "CAUTION", "WARNING"
        String safetyBadgeLabel,
        String safetySummary,
        int baseTempDayC,
        int baseTempNightC,
        int summitTempDayC,
        int summitTempNightC,
        int rainProbabilityPct,
        int windSpeedKmh,
        int cloudHuntingPct,
        int humidityPct,
        String weatherDescription,
        List<WeatherMetric> metrics,
        List<SafetyAlert> alerts,
        List<String> quickPills
    ) {}

    private record GeoProfile(
        double lat,
        double lng,
        int summitAltM,
        int baseAltM,
        String name
    ) {}

    private record CachedForecast(
        long timestamp,
        RawWeather raw
    ) {}

    private record RawWeather(
        int baseDayTemp,
        int baseNightTemp,
        int humidity,
        int rainProb,
        int windSpeed,
        double precipMm,
        String weatherDesc
    ) {}

    private final TourRepository tours;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final Map<String, CachedForecast> forecastCache = new ConcurrentHashMap<>();

    private static final Map<String, GeoProfile> GEO_MAP = new LinkedHashMap<>();

    static {
        GEO_MAP.put("fansipan", new GeoProfile(22.303, 103.775, 3143, 1500, "Fansipan - Sa Pa"));
        GEO_MAP.put("sa pa", new GeoProfile(22.336, 103.844, 3143, 1500, "Fansipan - Sa Pa"));
        GEO_MAP.put("bạch mộc", new GeoProfile(22.508, 103.588, 3046, 1200, "Bạch Mộc Lương Tử (Ky Quan San)"));
        GEO_MAP.put("ky quan san", new GeoProfile(22.508, 103.588, 3046, 1200, "Bạch Mộc Lương Tử (Ky Quan San)"));
        GEO_MAP.put("lảo thẩn", new GeoProfile(22.610, 103.627, 2860, 1800, "Lảo Thẩn - Y Tý"));
        GEO_MAP.put("y tý", new GeoProfile(22.610, 103.627, 2860, 1800, "Lảo Thẩn - Y Tý"));
        GEO_MAP.put("putaleng", new GeoProfile(22.427, 103.551, 3049, 1100, "Putaleng - Tam Đường"));
        GEO_MAP.put("nhìu cồ san", new GeoProfile(22.585, 103.585, 2965, 1300, "Nhìu Cồ San - Bát Xát"));
        GEO_MAP.put("tà chì nhù", new GeoProfile(21.579, 104.300, 2979, 1000, "Tà Chì Nhù - Trạm Tấu"));
        GEO_MAP.put("tà xùa", new GeoProfile(21.283, 104.467, 2865, 1600, "Tà Xùa - Bắc Yên"));
        GEO_MAP.put("tà năng", new GeoProfile(11.595, 108.455, 1100, 600, "Tà Năng - Phan Dũng"));
        GEO_MAP.put("phan dũng", new GeoProfile(11.595, 108.455, 1100, 600, "Tà Năng - Phan Dũng"));
        GEO_MAP.put("bidoup", new GeoProfile(12.091, 108.657, 2287, 1400, "Bidoup - Núi Bà"));
        GEO_MAP.put("cực đông", new GeoProfile(12.651, 109.460, 100, 10, "Mũi Đôi - Cực Đông"));
        GEO_MAP.put("mũi đôi", new GeoProfile(12.651, 109.460, 100, 10, "Mũi Đôi - Cực Đông"));
        GEO_MAP.put("bà đen", new GeoProfile(11.374, 106.168, 986, 50, "Núi Bà Đen - Tây Ninh"));
        GEO_MAP.put("chứa chan", new GeoProfile(10.992, 107.380, 837, 80, "Núi Chứa Chan - Đồng Nai"));
        GEO_MAP.put("đà lạt", new GeoProfile(11.940, 108.458, 1650, 1500, "Đà Lạt - Lâm Đồng"));
    }

    public WeatherSafetyService(TourRepository tours, ObjectMapper objectMapper) {
        this.tours = tours;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofMillis(2500))
            .setReadTimeout(Duration.ofMillis(2500))
            .build();
    }

    @Transactional(readOnly = true)
    public TourWeatherSafetyCard evaluateWeatherSafety(String destinationQuery, String monthOrDate) {
        var allTours = tours.findByIsActiveTrue();
        Tour matchedTour = findMatchingTour(destinationQuery, allTours);

        String destinationName = destinationQuery != null && !destinationQuery.isBlank()
            ? destinationQuery.trim()
            : (matchedTour != null ? matchedTour.getTitle() : "Fansipan - Sa Pa");

        GeoProfile geo = resolveGeoProfile(destinationName, matchedTour);

        int targetMonth = parseMonth(monthOrDate);
        LocalDate targetDate = parseDateOrToday(monthOrDate);

        RawWeather weather = fetchWeatherWithFallback(geo, targetDate, targetMonth);

        // Summit Temperature Calculation (Lapse rate: ~6.0°C per 1,000m elevation gain)
        int elevationGain = Math.max(0, geo.summitAltM() - geo.baseAltM());
        int tempDrop = (int) Math.round((elevationGain / 1000.0) * 6.0);

        int summitDay = weather.baseDayTemp() - tempDrop;
        int summitNight = weather.baseNightTemp() - tempDrop;

        // Cloud hunting probability calculation:
        // Ideal cloud sea conditions: Humidity 75-95%, Rain probability < 25%, Wind speed < 22km/h
        int cloudHuntingPct = calculateCloudHuntingProbability(weather);

        // Safety Status Evaluation
        String safetyStatus;
        String safetyBadgeLabel;
        String safetySummary;

        if (weather.rainProb() >= 65 || weather.precipMm() >= 15.0 || weather.windSpeed() >= 45 || summitNight <= 0) {
            safetyStatus = "WARNING";
            safetyBadgeLabel = "CẢNH BÁO THỜI TIẾT KHẮC NGHIỆT";
            safetySummary = "Điều kiện thời tiết tiềm ẩn nguy cơ cao (mưa to hoặc gió giật mạnh, nền nhiệt đỉnh hạ thấp). Cần trang bị chống nước kỹ lưỡng và đi cùng Leader chuyên nghiệp.";
        } else if (weather.rainProb() >= 35 || weather.precipMm() >= 5.0 || weather.windSpeed() >= 28 || summitNight <= 5) {
            safetyStatus = "CAUTION";
            safetyBadgeLabel = "CẦN LƯU Ý TRỜI LẠNH / ẨM";
            safetySummary = "Thời tiết có thể có mưa rào nhẹ hoặc nhiệt độ đỉnh về đêm rét buốt. Cần giữ ấm thân nhiệt 3 lớp và chuẩn bị áo mưa chuyên dụng.";
        } else {
            safetyStatus = "FAVORABLE";
            safetyBadgeLabel = "THUẬN LỢI - LÝ TƯỞNG TREKKING";
            safetySummary = "Trời khô ráo, tầm nhìn thoáng đãng, tỉ lệ săn mây và ngắm bình minh trên đỉnh rất cao. Thời điểm tuyệt vời để khởi hành!";
        }

        // Metrics Grid
        List<WeatherMetric> metrics = new ArrayList<>();
        metrics.add(new WeatherMetric(
            "Nhiệt độ chân núi",
            weather.baseNightTemp() + "°C - " + weather.baseDayTemp() + "°C",
            "Ban đêm / Ban ngày",
            "BASE_TEMP"
        ));
        metrics.add(new WeatherMetric(
            "Nhiệt độ đỉnh núi",
            summitNight + "°C - " + summitDay + "°C",
            "Đỉnh " + geo.summitAltM() + "m về đêm",
            "SUMMIT_TEMP"
        ));
        metrics.add(new WeatherMetric(
            "Khả năng mưa",
            weather.rainProb() + "%",
            weather.rainProb() < 30 ? "Khô ráo, ít mưa" : "Mưa rải rác",
            "RAIN"
        ));
        metrics.add(new WeatherMetric(
            "Gió trên đỉnh",
            weather.windSpeed() + " km/h",
            weather.windSpeed() < 25 ? "Gió nhẹ, êm ả" : "Gió khá mạnh trên sống núi",
            "WIND"
        ));
        metrics.add(new WeatherMetric(
            "Tỉ lệ săn mây",
            cloudHuntingPct + "%",
            cloudHuntingPct >= 75 ? "Biển mây dày đặc" : "Mây rải rác",
            "CLOUD"
        ));
        metrics.add(new WeatherMetric(
            "Độ ẩm không khí",
            weather.humidity() + "%",
            "Độ ẩm tương đối",
            "HUMIDITY"
        ));

        // Field Safety Alerts
        List<SafetyAlert> alerts = new ArrayList<>();
        if (summitNight <= 5) {
            alerts.add(new SafetyAlert(
                "CAUTION",
                "Nguy cơ hạ thân nhiệt về đêm (" + summitNight + "°C)",
                "Nhiệt độ đỉnh núi xuống rất thấp sau 20:00. Bắt buộc trang bị áo lông vũ ấm, mũ len che tai, găng tay lót nỉ và tất khô dự phòng."
            ));
        }
        if (weather.rainProb() >= 40) {
            alerts.add(new SafetyAlert(
                "CAUTION",
                "Đoạn dốc trơn trượt & rêu ẩm",
                "Địa hình đường rừng và dốc đá có thể trơn trượt sau mưa. Cần sử dụng gậy trekking đôi và giày có gai bám sâu (Vibram/Contagrip)."
            ));
        } else {
            alerts.add(new SafetyAlert(
                "INFO",
                "Địa hình khô ráo, bám chân tốt",
                "Điều kiện mặt đường rất thuận tiện cho việc di chuyển liên tục 5 - 7 giờ/ngày mà không lo bùn lầy."
            ));
        }
        if (cloudHuntingPct >= 75) {
            alerts.add(new SafetyAlert(
                "INFO",
                "Khung giờ vàng săn biển mây (05:30 - 06:45)",
                "Độ ẩm cao kết hợp gió nhẹ tạo điều kiện hoàn hảo để hình thành biển mây bồng bềnh ôm trọn các sườn núi khi mặt trời mọc."
            ));
        }
        alerts.add(new SafetyAlert(
            "INFO",
            "Yêu cầu thể lực thực địa",
            "Cung đường leo liên tục qua độ cao " + geo.summitAltM() + "m. Khuyến nghị chạy bộ hoặc leo cầu thang 30 phút mỗi ngày trước chuyến đi ít nhất 1 tuần."
        ));

        // Cross-card Quick Pills
        List<String> quickPills = new ArrayList<>();
        quickPills.add("🎒 Xem đồ cần chuẩn bị cho " + (matchedTour != null ? matchedTour.getTitle() : destinationName));
        quickPills.add("Lịch trình chi tiết " + (matchedTour != null ? matchedTour.getTitle() : destinationName));
        quickPills.add("Đặt tour này cho 2 người");

        String formattedTime = targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        return new TourWeatherSafetyCard(
            matchedTour != null ? matchedTour.getId() : null,
            matchedTour != null ? matchedTour.getTitle() : destinationName,
            matchedTour != null ? matchedTour.getSlug() : null,
            geo.name(),
            geo.summitAltM(),
            formattedTime,
            safetyStatus,
            safetyBadgeLabel,
            safetySummary,
            weather.baseDayTemp(),
            weather.baseNightTemp(),
            summitDay,
            summitNight,
            weather.rainProb(),
            weather.windSpeed(),
            cloudHuntingPct,
            weather.humidity(),
            weather.weatherDesc(),
            metrics,
            alerts,
            quickPills
        );
    }

    private RawWeather fetchWeatherWithFallback(GeoProfile geo, LocalDate date, int month) {
        String cacheKey = String.format(Locale.ROOT, "%.3f_%.3f_%s", geo.lat(), geo.lng(), date.toString());
        CachedForecast cached = forecastCache.get(cacheKey);
        long now = System.currentTimeMillis();

        if (cached != null && (now - cached.timestamp()) < 3600_000L) {
            return cached.raw();
        }

        try {
            String url = String.format(
                Locale.ROOT,
                "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto",
                geo.lat(),
                geo.lng()
            );

            String responseBody = restTemplate.getForObject(url, String.class);
            if (responseBody != null && !responseBody.isBlank()) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode current = root.path("current");
                JsonNode daily = root.path("daily");

                int baseDayTemp = 22;
                int baseNightTemp = 14;
                if (daily.has("temperature_2m_max") && daily.get("temperature_2m_max").size() > 0) {
                    baseDayTemp = (int) Math.round(daily.get("temperature_2m_max").get(0).asDouble(22.0));
                }
                if (daily.has("temperature_2m_min") && daily.get("temperature_2m_min").size() > 0) {
                    baseNightTemp = (int) Math.round(daily.get("temperature_2m_min").get(0).asDouble(14.0));
                }

                int humidity = current.has("relative_humidity_2m")
                    ? current.get("relative_humidity_2m").asInt(75)
                    : 75;

                int windSpeed = current.has("wind_speed_10m")
                    ? (int) Math.round(current.get("wind_speed_10m").asDouble(12.0))
                    : 12;

                int rainProb = 15;
                if (daily.has("precipitation_probability_max") && daily.get("precipitation_probability_max").size() > 0) {
                    rainProb = daily.get("precipitation_probability_max").get(0).asInt(15);
                }

                double precipMm = current.has("precipitation")
                    ? current.get("precipitation").asDouble(0.0)
                    : 0.0;

                int weatherCode = current.has("weather_code") ? current.get("weather_code").asInt(0) : 0;
                String weatherDesc = describeWeatherCode(weatherCode);

                RawWeather live = new RawWeather(baseDayTemp, baseNightTemp, humidity, rainProb, windSpeed, precipMm, weatherDesc);
                forecastCache.put(cacheKey, new CachedForecast(now, live));
                return live;
            }
        } catch (Exception e) {
            log.info("Open-Meteo external call skipped/failed: {}. Switching to seasonal mountain climate baseline.", e.getMessage());
        }

        // Seasonal mountain climate baseline fallback
        RawWeather fallback = generateSeasonalBaseline(geo, month);
        forecastCache.put(cacheKey, new CachedForecast(now, fallback));
        return fallback;
    }

    private RawWeather generateSeasonalBaseline(GeoProfile geo, int month) {
        int baseDay;
        int baseNight;
        int rainProb;
        int wind;
        int humidity;
        String desc;

        // Northern mountains winter/dry season (Nov - Feb)
        if (month == 11 || month == 12 || month == 1 || month == 2) {
            baseDay = 19;
            baseNight = 10;
            rainProb = 10;
            wind = 14;
            humidity = 78;
            desc = "Trời quang mây, hanh khô, đêm lạnh sâu";
        } else if (month >= 3 && month <= 5) { // Spring (March - May)
            baseDay = 24;
            baseNight = 16;
            rainProb = 25;
            wind = 12;
            humidity = 82;
            desc = "Xuân mát mẻ, sương mù sáng sớm, mùa hoa nở";
        } else if (month >= 6 && month <= 8) { // Summer / rainy season (June - August)
            baseDay = 27;
            baseNight = 19;
            rainProb = 55;
            wind = 18;
            humidity = 90;
            desc = "Ngày nắng ráo, chiều tối có khả năng xuất hiện mưa rào";
        } else { // Autumn (September - October)
            baseDay = 23;
            baseNight = 15;
            rainProb = 20;
            wind = 12;
            humidity = 76;
            desc = "Mùa thu lãng đãng, tiết trời trong lành, lộng gió";
        }

        // Adjust for southern mountains (Tà Năng, Bà Đen, Bidoup)
        if (geo.lat() < 13.0) {
            baseDay += 5;
            baseNight += 4;
        }

        return new RawWeather(baseDay, baseNight, humidity, rainProb, wind, 0.0, desc);
    }

    private int calculateCloudHuntingProbability(RawWeather w) {
        int score = 40;
        if (w.humidity() >= 75 && w.humidity() <= 95) score += 30;
        else if (w.humidity() > 65) score += 15;

        if (w.rainProb() <= 20) score += 20;
        else if (w.rainProb() <= 40) score += 10;
        else score -= 20;

        if (w.windSpeed() <= 18) score += 10;
        else if (w.windSpeed() > 30) score -= 15;

        return Math.min(95, Math.max(20, score));
    }

    private GeoProfile resolveGeoProfile(String name, Tour matchedTour) {
        String lower = name.toLowerCase(Locale.ROOT);
        for (var entry : GEO_MAP.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        if (matchedTour != null) {
            String title = matchedTour.getTitle() != null ? matchedTour.getTitle().toLowerCase(Locale.ROOT) : "";
            String loc = matchedTour.getLocation() != null ? matchedTour.getLocation().toLowerCase(Locale.ROOT) : "";
            for (var entry : GEO_MAP.entrySet()) {
                if (title.contains(entry.getKey()) || loc.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
            int alt = 2800;
            if (matchedTour.getAdventureProfile() != null && matchedTour.getAdventureProfile().getMaxAltitudeM() != null) {
                alt = matchedTour.getAdventureProfile().getMaxAltitudeM();
            }
            return new GeoProfile(22.303, 103.775, alt, 1200, matchedTour.getTitle());
        }
        return GEO_MAP.get("fansipan");
    }

    private Tour findMatchingTour(String query, List<Tour> allTours) {
        if (query == null || query.isBlank()) return null;
        String q = query.toLowerCase(Locale.ROOT).trim();
        for (var t : allTours) {
            String title = t.getTitle() == null ? "" : t.getTitle().toLowerCase(Locale.ROOT);
            String loc = t.getLocation() == null ? "" : t.getLocation().toLowerCase(Locale.ROOT);
            String slug = t.getSlug() == null ? "" : t.getSlug().toLowerCase(Locale.ROOT);
            if (title.contains(q) || loc.contains(q) || slug.contains(q) || q.contains(title)) {
                return t;
            }
        }
        return null;
    }

    private int parseMonth(String monthOrDate) {
        if (monthOrDate != null && !monthOrDate.isBlank()) {
            var m = java.util.regex.Pattern.compile("(?:tháng|thg|t)\\s*(\\d{1,2})", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(monthOrDate);
            if (m.find()) {
                try {
                    int val = Integer.parseInt(m.group(1));
                    if (val >= 1 && val <= 12) return val;
                } catch (NumberFormatException ignored) {}
            }
        }
        return LocalDate.now(VIETNAM_ZONE).getMonthValue();
    }

    private LocalDate parseDateOrToday(String monthOrDate) {
        if (monthOrDate != null && !monthOrDate.isBlank()) {
            try {
                return LocalDate.parse(monthOrDate.trim());
            } catch (Exception ignored) {}
        }
        return LocalDate.now(VIETNAM_ZONE);
    }

    private String describeWeatherCode(int code) {
        return switch (code) {
            case 0 -> "Trời quang mây, nắng ráo";
            case 1, 2, 3 -> "Mây rải rác, tầm nhìn tốt";
            case 45, 48 -> "Sương mù sườn núi, độ ẩm cao";
            case 51, 53, 55 -> "Mưa phùn nhẹ hạt";
            case 61, 63, 65 -> "Mưa rào rải rác";
            case 80, 81, 82 -> "Mưa dông từng cơn";
            default -> "Thời tiết điển hình vùng núi";
        };
    }
}
