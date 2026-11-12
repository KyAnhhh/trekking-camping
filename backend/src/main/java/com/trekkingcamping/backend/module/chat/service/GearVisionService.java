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
        String sanitizedBase64 = sanitizeAndEncodeJpeg(file);
        String prompt = buildPrompt(targetTour, notes, language);

        String rawJson = chatService.generateMultimodalJsonReply(prompt, "image/jpeg", sanitizedBase64, null);
        return parseResult(rawJson, targetTour);
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
                    advice
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
                    List.of()
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
}
