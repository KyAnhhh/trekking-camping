package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.chat.service.DataIngestionService;
import com.trekkingcamping.backend.module.tour.dto.SemanticTourResultDto;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.entity.TourGear;
import com.trekkingcamping.backend.module.tour.entity.TourItinerary;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.tour.repository.TourItineraryRepository;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.PgVectorStore;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Hybrid tour search combining Spring AI VectorStore similarity (TransformersEmbeddingModel / PgVector)
 * with Vietnamese/English intent & full-text scoring across itineraries, gear, and adventure profiles.
 */
@Service
public class SemanticTourSearchService {

    private static final Logger log = LoggerFactory.getLogger(SemanticTourSearchService.class);
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Set<String> STOP_WORDS = Set.of(
            "muon", "di", "cho", "va", "cung", "voi", "nhung", "cac", "mot", "tour", "chuyen",
            "du", "lich", "trek", "trekking", "camping", "tim", "kiem", "goi", "y", "toi", "minh",
            "to", "for", "and", "the", "with", "want", "find", "a", "an", "in", "on", "of", "trip"
    );

    private final TourRepository tourRepository;
    private final TourService tourService;
    private final TourItineraryRepository itineraryRepository;
    private final TourGearRepository gearRepository;
    private final VectorStore vectorStore;
    private final DataIngestionService ingestionService;
    private final JdbcTemplate jdbcTemplate;

    public SemanticTourSearchService(
            TourRepository tourRepository,
            TourService tourService,
            TourItineraryRepository itineraryRepository,
            TourGearRepository gearRepository,
            VectorStore vectorStore,
            DataIngestionService ingestionService,
            JdbcTemplate jdbcTemplate) {
        this.tourRepository = tourRepository;
        this.tourService = tourService;
        this.itineraryRepository = itineraryRepository;
        this.gearRepository = gearRepository;
        this.vectorStore = vectorStore;
        this.ingestionService = ingestionService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public List<SemanticTourResultDto> search(String query, Integer difficulty, String duration) {
        List<Tour> activeTours = tourService.withCovers(tourRepository.findByIsActiveTrue());
        List<Tour> filtered = activeTours.stream()
                .filter(t -> difficulty == null || Objects.equals(t.getDifficultyLevel(), difficulty))
                .filter(t -> matchesDuration(t, duration))
                .toList();

        String rawQuery = query == null ? "" : query.trim();
        if (rawQuery.isEmpty()) {
            return filtered.stream()
                    .map(t -> new SemanticTourResultDto(t, 1.0, "FILTER", List.of()))
                    .toList();
        }

        ensureTourIndexInitialized();

        // 1. VectorStore similarity scores keyed by tour_id
        Map<Long, Double> vectorScores = fetchVectorScores(rawQuery);

        // 2. Normalized intent & full-text signals
        String normQuery = normalize(rawQuery);
        List<String> tokens = tokenize(normQuery);
        IntentSignals intent = extractIntent(normQuery);

        List<ScoredResult> scored = new ArrayList<>();
        for (Tour tour : filtered) {
            scored.add(scoreTour(tour, normQuery, tokens, intent, vectorScores.getOrDefault(tour.getId(), 0.0)));
        }

        List<SemanticTourResultDto> results = scored.stream()
                .filter(s -> s.score > 0.12)
                .sorted(Comparator.comparingDouble((ScoredResult s) -> s.score).reversed()
                        .thenComparing(s -> s.tour.getId()))
                .map(s -> new SemanticTourResultDto(
                        s.tour,
                        Math.round(Math.min(0.99, s.score) * 100.0) / 100.0,
                        s.matchType,
                        s.reasons
                ))
                .toList();

        // If strict threshold eliminated everything, keep top semantic matches from vector/partial overlap if > 0.05
        if (results.isEmpty()) {
            return scored.stream()
                    .filter(s -> s.score > 0.05)
                    .sorted(Comparator.comparingDouble((ScoredResult s) -> s.score).reversed())
                    .limit(4)
                    .map(s -> new SemanticTourResultDto(
                            s.tour,
                            Math.round(Math.min(0.99, s.score) * 100.0) / 100.0,
                            s.matchType,
                            s.reasons
                    ))
                    .toList();
        }

        return results;
    }

    private void ensureTourIndexInitialized() {
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + PgVectorStore.VECTOR_TABLE_NAME + " WHERE metadata->>'category' = 'TOUR_INFO'",
                    Long.class
            );
            if (count == null || count == 0L) {
                ingestionService.ingestTourDataToVectorStore();
            }
        } catch (Exception e) {
            log.debug("Skipping lazy vector index check: {}", e.getMessage());
        }
    }

    private Map<Long, Double> fetchVectorScores(String rawQuery) {
        Map<Long, Double> scores = new HashMap<>();
        try {
            List<Document> docs = vectorStore.similaritySearch(
                    SearchRequest.query(rawQuery).withTopK(20)
            );
            if (docs == null) return scores;
            for (Document doc : docs) {
                Map<String, Object> meta = doc.getMetadata();
                if (meta == null || !"TOUR_INFO".equals(String.valueOf(meta.get("category")))) continue;
                Object tourIdObj = meta.get("tour_id");
                if (tourIdObj == null) continue;
                Long tourId = tourIdObj instanceof Number n ? n.longValue() : Long.valueOf(String.valueOf(tourIdObj));
                double sim = extractSimilarity(meta);
                scores.merge(tourId, sim, Math::max);
            }
        } catch (Exception e) {
            log.warn("Vector similarity search fallback triggered: {}", e.getMessage());
        }
        return scores;
    }

    private double extractSimilarity(Map<String, Object> meta) {
        Object distanceObj = meta.get("distance");
        if (distanceObj instanceof Number d) {
            return Math.max(0.0, Math.min(1.0, 1.0 - d.doubleValue()));
        }
        Object scoreObj = meta.get("score");
        if (scoreObj instanceof Number s) {
            return Math.max(0.0, Math.min(1.0, s.doubleValue()));
        }
        return 0.55;
    }

    private ScoredResult scoreTour(
            Tour tour,
            String normQuery,
            List<String> tokens,
            IntentSignals intent,
            double vectorScore) {
        String title = normalize(tour.getTitle());
        String location = normalize(tour.getLocation());
        String summary = normalize(tour.getSummary());
        String description = normalize(tour.getDescription());
        String safety = normalize(tour.getSafetyTips());
        String gearText = normalize(tour.getRequiredGear());

        List<TourItinerary> days = itineraryRepository.findByTourIdOrderByDayNumberAsc(tour.getId());
        StringBuilder itineraryText = new StringBuilder();
        for (TourItinerary day : days) {
            itineraryText.append(' ').append(normalize(day.getTitle()))
                    .append(' ').append(normalize(day.getDescription()));
        }
        List<TourGear> gearList = gearRepository.findByTourId(tour.getId());
        StringBuilder gearsJoined = new StringBuilder(gearText);
        for (TourGear g : gearList) {
            gearsJoined.append(' ').append(normalize(g.getGearName()));
        }

        String profileText = "";
        if (tour.getAdventureProfile() != null) {
            var p = tour.getAdventureProfile();
            profileText = normalize(p.getRecommendedMonths() + " " + p.getParticipationRequirements() + " " + p.getMedicalAccessNotes());
        }

        String combinedText = title + " " + location + " " + summary + " " + description + " " + itineraryText + " " + gearsJoined + " " + safety + " " + profileText;

        boolean directTitleOrLoc = title.contains(normQuery) || location.contains(normQuery);
        long matchedTokens = tokens.stream().filter(combinedText::contains).count();
        double tokenRatio = tokens.isEmpty() ? 0.0 : (double) matchedTokens / tokens.size();

        double keywordScore = 0.0;
        if (directTitleOrLoc) keywordScore += 0.55;
        if (summary.contains(normQuery) || description.contains(normQuery)) keywordScore += 0.35;
        keywordScore += tokenRatio * 0.45;

        double intentScore = 0.0;
        List<String> reasons = new ArrayList<>();
        if (directTitleOrLoc) reasons.add("Khớp trực tiếp tên/địa điểm");

        if (intent.beginner && Objects.equals(tour.getDifficultyLevel(), 1)) {
            intentScore += 0.28;
            reasons.add("Phù hợp người mới · Độ khó Dễ");
        } else if (intent.moderate && Objects.equals(tour.getDifficultyLevel(), 2)) {
            intentScore += 0.24;
            reasons.add("Độ khó Trung bình vừa sức");
        } else if (intent.hard && Objects.equals(tour.getDifficultyLevel(), 3)) {
            intentScore += 0.28;
            reasons.add("Thử thách · Mạo hiểm");
        }

        if (intent.shortTrip && tour.getDurationDays() != null && tour.getDurationDays() <= 2) {
            intentScore += 0.22;
            reasons.add("Lịch trình ngắn gọn (" + tour.getDurationDays() + " ngày)");
        } else if (intent.longTrip && tour.getDurationDays() != null && tour.getDurationDays() >= 3) {
            intentScore += 0.22;
            reasons.add("Hành trình dài ngày (" + tour.getDurationDays() + " ngày)");
        }

        if (intent.cloudHunting && (combinedText.contains("may") || combinedText.contains("cloud") || combinedText.contains("dinh") || combinedText.contains("cao"))) {
            intentScore += 0.26;
            reasons.add("Trải nghiệm săn mây / đỉnh cao");
        }
        if (intent.forestCamping && (combinedText.contains("rung") || combinedText.contains("cam trai") || combinedText.contains("reu") || combinedText.contains("camp") || combinedText.contains("forest"))) {
            intentScore += 0.22;
            reasons.add("Rừng nguyên sinh / Cắm trại thiên nhiên");
        }
        if (intent.waterfall && (combinedText.contains("thac") || combinedText.contains("suoi") || combinedText.contains("hang") || combinedText.contains("waterfall"))) {
            intentScore += 0.24;
            reasons.add("Khám phá thác / suối / hang");
        }

        if (vectorScore >= 0.35 && reasons.size() < 2) {
            reasons.add("Tương đồng ngữ nghĩa AI (" + Math.round(vectorScore * 100) + "%)");
        } else if (matchedTokens > 0 && reasons.isEmpty()) {
            reasons.add("Khớp mô tả lịch trình & trang bị");
        }

        double finalScore = Math.min(0.99, vectorScore * 0.40 + keywordScore * 0.45 + intentScore * 0.50);
        if (directTitleOrLoc) {
            finalScore = Math.max(finalScore, 0.88);
        }

        String matchType = (vectorScore >= 0.30 && (keywordScore > 0.1 || intentScore > 0.1))
                ? "HYBRID"
                : (keywordScore > intentScore + vectorScore ? "KEYWORD" : "SEMANTIC");

        return new ScoredResult(tour, finalScore, matchType, reasons.stream().distinct().limit(3).toList());
    }

    private boolean matchesDuration(Tour tour, String duration) {
        if (duration == null || duration.isBlank()) return true;
        Integer days = tour.getDurationDays();
        if (days == null) return true;
        return switch (duration.trim().toLowerCase(Locale.ROOT)) {
            case "short" -> days <= 2;
            case "long" -> days >= 3;
            default -> true;
        };
    }

    private IntentSignals extractIntent(String normQuery) {
        boolean beginner = containsAny(normQuery, "nguoi moi", "nhe nhang", "de di", "de", "moi bat dau", "beginner", "easy", "gentle");
        boolean moderate = containsAny(normQuery, "trung binh", "vua suc", "moderate");
        boolean hard = containsAny(normQuery, "mao hiem", "thu thach", "chinh phuc", "dinh cao", "hard", "challenge", "challenging");
        boolean shortTrip = containsAny(normQuery, "cuoi tuan", "ngan ngay", "2 ngay", "2n1d", "1 ngay", "weekend", "short");
        boolean longTrip = containsAny(normQuery, "dai ngay", "3 ngay", "3n2d", "xuyen rung", "long");
        boolean cloudHunting = containsAny(normQuery, "san may", "ngam may", "binh minh", "hoang hon", "sao", "cloud", "sunrise");
        boolean forestCamping = containsAny(normQuery, "rung", "cam trai", "leu", "reu", "thong", "co lau", "camp", "forest", "moss");
        boolean waterfall = containsAny(normQuery, "thac", "suoi", "hang", "k50", "waterfall", "stream", "cave");
        return new IntentSignals(beginner, moderate, hard, shortTrip, longTrip, cloudHunting, forestCamping, waterfall);
    }

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }

    private List<String> tokenize(String normQuery) {
        return Arrays.stream(normQuery.split("[\\s,;:.!?/\\-]+"))
                .filter(t -> t.length() >= 2 && !STOP_WORDS.contains(t))
                .distinct()
                .toList();
    }

    static String normalize(String input) {
        if (input == null || input.isBlank()) return "";
        String replaced = input.replace('đ', 'd').replace('Đ', 'd');
        String decomposed = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        return DIACRITICS.matcher(decomposed).replaceAll("").toLowerCase(Locale.ROOT).trim();
    }

    private record IntentSignals(
            boolean beginner, boolean moderate, boolean hard,
            boolean shortTrip, boolean longTrip,
            boolean cloudHunting, boolean forestCamping, boolean waterfall
    ) {}

    private record ScoredResult(Tour tour, double score, String matchType, List<String> reasons) {}
}
