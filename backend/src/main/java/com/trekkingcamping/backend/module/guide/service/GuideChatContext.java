package com.trekkingcamping.backend.module.guide.service;
import com.trekkingcamping.backend.module.guide.repository.ScheduleGuideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.time.*;
import java.util.Locale;
@Service
public class GuideChatContext {
    private final ScheduleGuideRepository assignments;
    public GuideChatContext(ScheduleGuideRepository assignments) { this.assignments = assignments; }
    @Transactional(readOnly = true)
    public String forMessage(String message) {
        String normalized = java.text.Normalizer.normalize(message, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
        if (!normalized.contains("huong dan") && !normalized.contains("truong doan") && !normalized.contains("guide") && !normalized.contains("chuyen gia") && !normalized.contains("dan doan")) return "";
        var rows = assignments.upcoming(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")), PageRequest.of(0, 30));
        if (rows.isEmpty()) return "Chưa có dữ liệu phân công hướng dẫn viên cho chuyến sắp tới. Không tự suy đoán người dẫn đoàn.";
        StringBuilder out = new StringBuilder("Phân công đọc trực tiếp tại thời điểm hỏi (tối đa 30 người của các chuyến gần nhất; không đại diện toàn bộ lịch). Chỉ khẳng định cho đúng tour và ngày xuất hiện dưới đây:\n");
        for (var a : rows) {
            var s = a.getSchedule(); var g = a.getGuide();
            out.append(s.getTour().getTitle()).append(" | ").append(s.getDepartureDate()).append(" → ").append(s.getReturnDate())
                    .append(" | ").append(g.getFullName()).append(" | ").append(a.getRole()).append(" | Chuyên môn: ")
                    .append(g.getSpecialties() == null ? "Chưa cập nhật" : g.getSpecialties()).append('\n');
        }
        return out.toString();
    }
}
