package com.trekkingcamping.backend.module.chat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.chat.dto.GearCheckResultDto;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.entity.TourGear;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.IIOException;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.List;

/**
 * Inspects uploaded photos of trekking/camping gear using Gemini Multimodal Vision
 * against the selected tour's terrain, difficulty, and required packing checklist.
 */
@Service
public class GearVisionService {

    private static final Logger log = LoggerFactory.getLogger(GearVisionService.class);
    private static final long MAX_FILE_BYTES = 5 * 1024 * 1024L;
    private static final int MAX_DIM_PX = 1024;
    private static final String YOLO_SERVICE_URL = "http://127.0.0.1:8001/detect-gear";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(1500))
            .build();

    private final ChatService chatService;
    private final TourRepository tourRepository;
    private final TourGearRepository gearRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public GearVisionService(
            ChatService chatService,
            TourRepository tourRepository,
            TourGearRepository gearRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.chatService = chatService;
        this.tourRepository = tourRepository;
        this.gearRepository = gearRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public GearCheckResultDto inspectGear(
            MultipartFile file,
            Long tourId,
            Long bookingId,
            String notes,
            String language,
            String userEmail) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("Ảnh hành trang phải có nội dung và không vượt quá 5 MB.");
        }
        if (notes != null && notes.length() > 600) {
            throw new IllegalArgumentException("Ghi chú tối đa 600 ký tự.");
        }

        Tour targetTour = resolveTargetTour(tourId, bookingId, userEmail);

        // 1. TIER-1 INFERENCE: Fast, zero-token Edge AI (YOLOv8 8-Classes Microservice)
        Optional<GearCheckResultDto> yoloResult = tryYoloLocalInference(file, targetTour, notes, language);
        if (yoloResult.isPresent()) {
            log.info("Tier-1 YOLOv8 successfully recognized gear items. Bypassing Gemini API (0 tokens consumed).");
            return yoloResult.get();
        }

        // 2. TIER-2 FALLBACK: Complex scenes or unrecognized items -> Gemini Multimodal Vision API
        log.info("Tier-1 YOLOv8 found no match or unavailable; falling back to Tier-2 Gemini Multimodal Vision...");
        String sanitizedBase64 = sanitizeAndEncodeJpeg(file);
        String prompt = buildPrompt(targetTour, notes, language);

        String rawJson = chatService.generateMultimodalJsonReply(prompt, "image/jpeg", sanitizedBase64, null);
        return parseResult(rawJson, targetTour);
    }

    private Optional<GearCheckResultDto> tryYoloLocalInference(
            MultipartFile file,
            Tour targetTour,
            String notes,
            String language) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(YOLO_SERVICE_URL + "?confidence=0.35&drawBoxes=true"))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "image/jpeg")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            int itemCount = root.path("itemCount").asInt(0);
            if (itemCount <= 0) {
                return Optional.empty();
            }

            return Optional.of(buildTier1Result(root, targetTour, language));
        } catch (Exception e) {
            log.debug("Local YOLO service unavailable or skipped: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private GearCheckResultDto buildTier1Result(JsonNode root, Tour tour, String language) {
        boolean isEn = "en".equalsIgnoreCase(language);
        List<GearCheckResultDto.DetectedItem> detected = new ArrayList<>();
        Set<String> detectedCodes = new HashSet<>();
        List<String> safetyAdvice = new ArrayList<>();

        JsonNode itemsNode = root.path("detectedItems");
        if (itemsNode.isArray()) {
            for (JsonNode item : itemsNode) {
                String rawName = item.path("rawName").asText("");
                String nameVi = item.path("nameVi").asText(rawName);
                String nameEn = item.path("nameEn").asText(rawName);
                double conf = item.path("confidence").asDouble(0.8);
                String advice = item.path("safetyAdvice").asText("");

                detectedCodes.add(rawName.toLowerCase(Locale.ROOT));

                List<Double> boxList = new ArrayList<>();
                JsonNode boxNode = item.path("box");
                if (boxNode.isArray()) {
                    for (JsonNode b : boxNode) boxList.add(b.asDouble());
                }

                String status = conf >= 0.50 ? "OK" : "WARNING";
                String note = buildItemNote(rawName, isEn);

                detected.add(new GearCheckResultDto.DetectedItem(
                        isEn ? nameEn : nameVi,
                        status,
                        note,
                        conf,
                        boxList
                ));

                if (!advice.isBlank() && !safetyAdvice.contains(advice)) {
                    safetyAdvice.add(advice);
                }
            }
        }

        // Determine critical missing items based on tour difficulty & overnight status
        List<String> missing = new ArrayList<>();
        int difficulty = tour != null ? tour.getDifficultyLevel() : 2;
        boolean isOvernight = tour != null && tour.getDurationNights() != null && tour.getDurationNights() > 0;

        if (difficulty >= 2 && !detectedCodes.contains("giay-leo-nui")) {
            missing.add(isEn ? "Specialized trekking boots with high traction" : "Giày leo núi / trekking chuyên dụng có đế gai bám đá");
        }
        if (!detectedCodes.contains("air-mineral")) {
            missing.add(isEn ? "Hydration bladder or water bottle (min 1.5L)" : "Bình nước hoặc túi nước dã ngoại (tối thiểu 1.5L)");
        }
        if (!detectedCodes.contains("alat-penerangan")) {
            missing.add(isEn ? "Headlamp with spare batteries" : "Đèn pin đội đầu chuyên dụng kèm pin dự phòng");
        }
        if (difficulty >= 2 && !detectedCodes.contains("tas-gunung")) {
            missing.add(isEn ? "Ergonomic framed hiking backpack" : "Balo dã ngoại có đai hông trợ lực");
        }
        if (!detectedCodes.contains("hop-y-te")) {
            missing.add(isEn ? "Personal first-aid kit & insect repellent" : "Hộp sơ cứu cá nhân & xịt chống vắt/côn trùng");
        }
        if (isOvernight && !detectedCodes.contains("leu-trai")) {
            missing.add(isEn ? "Weatherproof camping tent & sleeping bag" : "Lều cắm trại dã ngoại chống thấm & túi ngủ ấm");
        }

        // Calculate Readiness Score: base 50 + 15 per distinct detected item
        int score = Math.min(95, 45 + detectedCodes.size() * 14);
        String verdict = score >= 70 ? "READY" : "NEEDS_IMPROVEMENT";

        String modelVer = root.path("modelVersion").asText("Hiking YOLO26");
        String summary = isEn
                ? (modelVer + " detected " + detected.size() + " trekking gear item(s) in your photo. "
                    + (score >= 70 ? "Your gear is well-aligned with the selected expedition!" : "Please review the essential missing items below before departure."))
                : ("Mô hình " + modelVer + " đã nhận diện thành công " + detected.size() + " món đồ dã ngoại trong ảnh của bạn. "
                    + (score >= 70 ? "Hành trang của bạn đạt chuẩn an toàn cho chuyến đi!" : "Bạn nên bổ sung thêm một số trang bị thiết yếu bên dưới để chuyến đi trọn vẹn."));

        String annotatedB64 = root.path("annotatedImageBase64").asText(null);

        return new GearCheckResultDto(
                tour != null ? tour.getTitle() : null,
                verdict,
                score,
                summary,
                detected,
                missing,
                safetyAdvice,
                "TIER1_YOLO_LOCAL",
                0,
                annotatedB64
        );
    }

    private String buildItemNote(String code, boolean isEn) {
        return switch (code) {
            case "giay-leo-nui" -> isEn ? "Proper trekking boots with deep tread for slick rock trails." : "Giày leo núi có độ bám dốc cao, bảo vệ cổ chân chống trơn trượt.";
            case "tas-gunung" -> isEn ? "Framed backpack shifts weight to hips, saving shoulder fatigue." : "Balo có đai trợ lực phân bổ trọng lượng vào hông, giảm tải vai và cột sống.";
            case "jaket" -> isEn ? "Thermal/windproof layer is essential for mountain night drops." : "Áo ấm giữ nhiệt chống gió, cần thiết khi nhiệt độ ban đêm hạ nhanh.";
            case "alat-penerangan" -> isEn ? "Hands-free headlamp for safe early morning or night hiking." : "Đèn pin đội đầu giúp giải phóng 2 tay khi leo dốc đêm hoặc sáng sớm.";
            case "gay-trekking" -> isEn ? "Absorbs 25% of knee shock and stabilizes river/mud crossings." : "Gậy trekking trợ lực giảm 25% tải trọng lên đầu gối khi xuống dốc.";
            case "leu-trai" -> isEn ? "Outdoor weatherproof shelter for campsite accommodation." : "Lều cắm trại che mưa gió dã ngoại đạt tiêu chuẩn.";
            case "air-mineral" -> isEn ? "Continuous hydration prevents muscle cramps and fatigue." : "Nước uống bù khoáng giúp duy trì thể lực liên tục trên hành trình.";
            case "hop-y-te" -> isEn ? "Emergency medical supplies for cuts, blisters, and insect bites." : "Bộ y tế sơ cứu khẩn cấp dùng để xử lý vết thương và côn trùng cắn.";
            default -> isEn ? "Inspected and ready for the expedition." : "Đã đối chiếu sẵn sàng cho chuyến đi.";
        };
    }

    private Tour resolveTargetTour(Long tourId, Long bookingId, String userEmail) {
        if (bookingId != null) {
            if (userEmail == null || userEmail.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để kiểm tra theo booking.");
            }
            var user = userRepository.findByEmail(userEmail)
                    .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
            Booking booking = bookingRepository.findById(bookingId)
                    .filter(b -> b.getUser() != null && Objects.equals(b.getUser().getId(), user.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt tour của bạn."));
            return booking.getSchedule() != null ? booking.getSchedule().getTour() : null;
        }
        if (tourId != null) {
            return tourRepository.findById(tourId)
                    .filter(t -> Boolean.TRUE.equals(t.getIsActive()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tour được chọn."));
        }
        return null;
    }

    /**
     * Validates pixel content (JPEG/PNG), scales down large images, and re-encodes to JPEG
     * so EXIF/GPS metadata and hidden payloads are completely stripped before calling Gemini.
     */
    String sanitizeAndEncodeJpeg(MultipartFile file) throws IOException {
        BufferedImage source;
        try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Chỉ nhận ảnh JPEG hoặc PNG hợp lệ.");
            }
            var reader = readers.next();
            try {
                if (!Set.of("jpeg", "jpg", "png").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException("Chỉ nhận ảnh JPEG hoặc PNG.");
                }
                reader.setInput(stream);
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                if (w < 1 || h < 1 || (long) w * h > 16_000_000L) {
                    throw new IllegalArgumentException("Kích thước ảnh không hợp lệ (tối đa 16 megapixel).");
                }
                source = reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IIOException e) {
            throw new IllegalArgumentException("Không đọc được nội dung ảnh. Hãy thử ảnh JPEG hoặc PNG khác.");
        }

        int srcW = source.getWidth();
        int srcH = source.getHeight();
        int targetW = srcW;
        int targetH = srcH;
        if (srcW > MAX_DIM_PX || srcH > MAX_DIM_PX) {
            double scale = (double) MAX_DIM_PX / Math.max(srcW, srcH);
            targetW = Math.max(1, (int) Math.round(srcW * scale));
            targetH = Math.max(1, (int) Math.round(srcH * scale));
        }

        BufferedImage clean = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = clean.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, targetW, targetH);
            g.drawImage(source, 0, 0, targetW, targetH, null);
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (!ImageIO.write(clean, "jpg", out)) {
            throw new IOException("JPEG encoder unavailable");
        }
        return Base64.getEncoder().encodeToString(out.toByteArray());
    }

    private String buildPrompt(Tour tour, String notes, String language) {
        boolean isEn = "en".equalsIgnoreCase(language);
        StringBuilder sb = new StringBuilder();
        sb.append(isEn
                ? "You are an experienced Trekking & Camping Expedition Safety Specialist at Trek & Camp.\n"
                : "Bạn là Chuyên gia An toàn & Trang bị Trekking/Camping giàu kinh nghiệm của Trek & Camp.\n");
        sb.append(isEn
                ? "Analyze the user's uploaded photo of their trekking/camping gear. Identify each visible item, evaluate whether it is suitable for the expedition, list important missing items, and give practical safety advice.\n\n"
                : "Hãy phân tích ảnh trang bị trekking/cắm trại mà khách tải lên. Nhận diện từng món đồ nhìn thấy trong ảnh, đánh giá mức độ phù hợp với cung đường, liệt kê các món quan trọng còn thiếu, và đưa ra lời khuyên an toàn thực tế.\n\n");

        if (tour != null) {
            sb.append("### TARGET EXPEDITION CONTEXT\n");
            sb.append("- Tour: ").append(tour.getTitle()).append('\n');
            sb.append("- Location: ").append(Objects.toString(tour.getLocation(), "Vietnam")).append('\n');
            sb.append("- Duration: ").append(tour.getDurationDays()).append("D").append(tour.getDurationNights()).append("N\n");
            sb.append("- Difficulty (1=Easy, 2=Moderate, 3=Hard): ").append(tour.getDifficultyLevel()).append('\n');
            if (tour.getRequiredGear() != null && !tour.getRequiredGear().isBlank()) {
                sb.append("- Required Self-Prepared Gear: ").append(tour.getRequiredGear()).append('\n');
            }
            List<TourGear> gears = gearRepository.findByTourId(tour.getId());
            if (!gears.isEmpty()) {
                sb.append("- Tour Gear List:\n");
                for (TourGear gear : gears) {
                    sb.append("  * ").append(gear.getGearName())
                            .append(Boolean.TRUE.equals(gear.getIsProvided()) ? " (Provided by organizer)" : " (Guest brings or rents)")
                            .append('\n');
                }
            }
            if (tour.getAdventureProfile() != null && tour.getAdventureProfile().getMaxAltitudeM() != null) {
                sb.append("- Max Altitude: ").append(tour.getAdventureProfile().getMaxAltitudeM()).append("m\n");
            }
            if (tour.getSafetyTips() != null && !tour.getSafetyTips().isBlank()) {
                sb.append("- Safety Notes: ").append(tour.getSafetyTips()).append('\n');
            }
        } else {
            sb.append("### CONTEXT\nNo specific tour selected; evaluate against general mountain trekking & overnight camping standards in Vietnam (humid/wet forest trails, steep ascents, cool night temperatures).\n");
        }

        if (notes != null && !notes.isBlank()) {
            sb.append("\n### USER QUESTION / NOTE\n").append(notes.trim()).append('\n');
        }

        sb.append("\n### STRICT OUTPUT FORMAT\n");
        sb.append(isEn ? "Respond entirely in English using valid JSON matching this schema:\n"
                : "Trả lời hoàn toàn bằng Tiếng Việt bằng JSON hợp lệ theo đúng schema sau:\n");
        sb.append("""
                {
                  "verdict": "READY | NEEDS_IMPROVEMENT | NOT_SUITABLE",
                  "readinessScore": 0-100,
                  "summary": "2-3 concise sentences summarizing overall gear readiness",
                  "detectedItems": [
                    { "name": "Item name", "status": "OK | WARNING | INSUFFICIENT", "note": "Specific inspection note" }
                  ],
                  "missingItems": ["Critical missing item 1", "Critical missing item 2"],
                  "safetyAdvice": ["Practical tip 1", "Practical tip 2"]
                }
                """);
        return sb.toString();
    }

    GearCheckResultDto parseResult(String rawJson, Tour tour) {
        String cleaned = rawJson == null ? "" : rawJson.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("\\s*```$", "").trim();
        }
        try {
            JsonNode root = objectMapper.readTree(cleaned);
            String verdict = normalizeVerdict(root.path("verdict").asText("NEEDS_IMPROVEMENT"));
            int score = Math.max(0, Math.min(100, root.path("readinessScore").asInt(65)));
            String summary = root.path("summary").asText("Đã phân tích hình ảnh hành trang của bạn.");

            List<GearCheckResultDto.DetectedItem> detected = new ArrayList<>();
            if (root.path("detectedItems").isArray()) {
                for (JsonNode item : root.path("detectedItems")) {
                    String name = item.path("name").asText("").trim();
                    if (name.isEmpty()) continue;
                    String status = normalizeItemStatus(item.path("status").asText("OK"));
                    String note = item.path("note").asText("").trim();
                    detected.add(new GearCheckResultDto.DetectedItem(name, status, note));
                }
            }

            List<String> missing = readStringArray(root.path("missingItems"));
            List<String> advice = readStringArray(root.path("safetyAdvice"));

            return new GearCheckResultDto(
                    tour != null ? tour.getTitle() : null,
                    verdict,
                    score,
                    summary,
                    detected,
                    missing,
                    advice,
                    "TIER2_GEMINI_VISION",
                    680,
                    null
            );
        } catch (Exception e) {
            log.warn("Failed to parse structured GearVision JSON response: {}", e.getMessage());
            return new GearCheckResultDto(
                    tour != null ? tour.getTitle() : null,
                    "NEEDS_IMPROVEMENT",
                    60,
                    cleaned.isBlank() ? "Chưa phân tích được ảnh hành trang." : cleaned,
                    List.of(),
                    List.of(),
                    List.of(),
                    "TIER2_GEMINI_VISION",
                    680,
                    null
            );
        }
    }

    private List<String> readStringArray(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode el : node) {
                String text = el.asText("").trim();
                if (!text.isEmpty()) list.add(text);
            }
        }
        return list;
    }

    private String normalizeVerdict(String value) {
        String upper = Objects.toString(value, "").trim().toUpperCase(Locale.ROOT);
        return Set.of("READY", "NEEDS_IMPROVEMENT", "NOT_SUITABLE").contains(upper) ? upper : "NEEDS_IMPROVEMENT";
    }

    private String normalizeItemStatus(String value) {
        String upper = Objects.toString(value, "").trim().toUpperCase(Locale.ROOT);
        return Set.of("OK", "WARNING", "INSUFFICIENT").contains(upper) ? upper : "WARNING";
    }

    public Map<String, Object> checkServiceHealth() {
        Map<String, Object> res = new HashMap<>();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:8001/health"))
                    .timeout(Duration.ofMillis(2000))
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode node = objectMapper.readTree(response.body());
                res.put("online", true);
                res.put("status", node.path("status").asText("UP"));
                res.put("modelLoaded", node.path("modelLoaded").asBoolean(true));
                res.put("modelVersion", node.path("modelVersion").asText("YOLO26"));
                res.put("modelPath", node.path("modelPath").asText(""));
                res.put("classesCount", node.path("classesCount").asInt(8));
                res.put("classes", node.path("classes"));
                res.put("architecture", "Edge YOLO (NMS-Free End-to-End)");
                return res;
            }
        } catch (Exception e) {
            log.debug("YOLO service offline or unreachable: {}", e.getMessage());
        }
        res.put("online", false);
        res.put("status", "DOWN");
        res.put("modelLoaded", false);
        res.put("note", "Dịch vụ Python AI (Port 8001) đang offline hoặc chưa khởi động.");
        return res;
    }
}
