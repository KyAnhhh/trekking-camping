package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.entity.TourGear;
import com.trekkingcamping.backend.module.tour.entity.TourItinerary;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.tour.repository.TourItineraryRepository;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ai.vectorstore.PgVectorStore;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DataIngestionService {

    private final VectorStore vectorStore;
    private final TourRepository tourRepository;
    private final TourItineraryRepository itineraryRepository;
    private final TourGearRepository gearRepository;
    private final JdbcTemplate jdbc;

    public DataIngestionService(VectorStore vectorStore,
                                TourRepository tourRepository,
                                TourItineraryRepository itineraryRepository,
                                TourGearRepository gearRepository, JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.tourRepository = tourRepository;
        this.itineraryRepository = itineraryRepository;
        this.gearRepository = gearRepository;
        this.jdbc = jdbc;
    }

    @Transactional(rollbackFor = Exception.class)
    public int ingestTourDataToVectorStore() {
        // Serialize full replacements, including an empty active catalog. JDBC and PgVector
        // participate in the same DB transaction so embedding failure restores the old index.
        jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtext(?))", "tour-knowledge-sync");
        List<Tour> tours = tourRepository.findByIsActiveTrue();
        List<Document> documents = new ArrayList<>();

        for (Tour tour : tours) {
            // 1. Lấy thông tin lịch trình & trang bị
            List<TourItinerary> itineraries = itineraryRepository.findByTourIdOrderByDayNumberAsc(tour.getId());
            List<TourGear> gears = gearRepository.findByTourId(tour.getId());

            StringBuilder contentBuilder = new StringBuilder();
            contentBuilder.append("Tên Tour: ").append(tour.getTitle()).append("\n");
            contentBuilder.append("Địa điểm: ").append(tour.getLocation()).append("\n");
            contentBuilder.append("Thời gian: ").append(tour.getDurationDays()).append(" ngày ").append(tour.getDurationNights()).append(" đêm\n");
            contentBuilder.append("Giá và lịch còn chỗ: tra dữ liệu hiện tại, không suy ra từ tài liệu.\n");
            contentBuilder.append("Mô tả: ").append(tour.getDescription()).append("\n");
            contentBuilder.append("Độ khó: ").append(tour.getDifficultyLevel()).append("/3\n");
            contentBuilder.append("Lưu ý an toàn: ").append(tour.getSafetyTips()).append("\n");
            contentBuilder.append("Đồ dùng tự chuẩn bị: ").append(tour.getRequiredGear()).append("\n");

            if (!itineraries.isEmpty()) {
                contentBuilder.append("Lịch trình chi tiết:\n");
                for (TourItinerary it : itineraries) {
                    contentBuilder.append("- Ngày ").append(it.getDayNumber()).append(": ").append(it.getTitle()).append(" - ").append(it.getDescription()).append("\n");
                }
            }

            if (!gears.isEmpty()) {
                contentBuilder.append("Thiết bị nhà tour cung cấp/cho thuê:\n");
                for (TourGear g : gears) {
                    contentBuilder.append("- ").append(g.getGearName())
                            .append(Boolean.TRUE.equals(g.getIsProvided()) ? " (Đi kèm)" :
                                    g.getRentalPrice()!=null && g.getRentalPrice().signum()>0 ? " (Thuê thêm; kiểm tra giá trên trang tour)" : " (Tự chuẩn bị; chưa xác nhận dịch vụ cho thuê)")
                            .append("\n");
                }
            }

            // Tạo Document AI với Metadata
            Document doc = new Document(
                    contentBuilder.toString(),
                    Map.of("tour_id", tour.getId(), "slug", tour.getSlug(), "category", "TOUR_INFO",
                            "tour_updated_at", java.util.Objects.toString(tour.getUpdatedAt(),""),
                            "ingested_at",java.time.Instant.now().toString())
            );
            documents.addAll(new org.springframework.ai.transformer.splitter.TokenTextSplitter().apply(List.of(doc)));
        }

        // Only replace generated tour documents; user-uploaded TXT knowledge is preserved.
        jdbc.update("DELETE FROM " + PgVectorStore.VECTOR_TABLE_NAME + " WHERE metadata->>'category' = ?", "TOUR_INFO");
        if (!documents.isEmpty()) {
            vectorStore.add(documents);
        }

        return tours.size();
    }
}
