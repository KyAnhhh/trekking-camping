package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class TourKnowledgeContent {
    public static final String VERSION="tour-content-v2";
    public record Snapshot(String text,String fingerprint) {}
    private final TourItineraryRepository itineraries;
    private final TourGearRepository gears;
    public TourKnowledgeContent(TourItineraryRepository itineraries,TourGearRepository gears) { this.itineraries=itineraries;this.gears=gears; }
    @Transactional(readOnly=true,timeout=5)
    public Snapshot snapshot(Tour t) {
        var out=new StringBuilder();
        line(out,"Tên tour",t.getTitle());line(out,"Slug",t.getSlug());line(out,"Địa điểm",t.getLocation());
        line(out,"Số ngày",t.getDurationDays());line(out,"Số đêm",t.getDurationNights());
        line(out,"Tóm tắt",t.getSummary());line(out,"Mô tả",t.getDescription());line(out,"Độ khó",t.getDifficultyLevel());
        line(out,"An toàn",t.getSafetyTips());line(out,"Tự chuẩn bị",t.getRequiredGear());
        line(out,"Bảo hiểm",t.getInsuranceInfo());line(out,"Liên hệ khẩn cấp công khai",t.getEmergencyHotline());
        out.append("Giá tour, giá thuê và lịch còn chỗ: tra DB hiện tại, không suy ra từ tài liệu.\n");
        var a=t.getAdventureProfile();
        if(a!=null) {
            line(out,"Quãng đường km",a.getDistanceKm());line(out,"Độ cao m",a.getMaxAltitudeM());line(out,"Leo lên m",a.getTotalAscentM());
            line(out,"Giờ vận động/ngày",a.getActiveHoursPerDay());line(out,"Giờ tiếp cận y tế",a.getMedicalAccessHours());
            line(out,"Ghi chú y tế",a.getMedicalAccessNotes());line(out,"Tháng gợi ý",a.getRecommendedMonths());
            line(out,"Đón khách",a.getPickupNotes());line(out,"Tập kết",a.getAssemblyPoint());line(out,"Khách/guide",a.getCustomersPerGuide());
            line(out,"Yêu cầu tham gia",a.getParticipationRequirements());line(out,"Nguồn",a.getSourceNote());line(out,"Ngày kiểm tra nguồn",a.getVerifiedOn());
        }
        itineraries.findByTourIdOrderByDayNumberAsc(t.getId()).stream()
                .sorted(Comparator.comparing(TourItinerary::getDayNumber,Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(d->Objects.toString(d.getTitle(),"")).thenComparing(d->Objects.toString(d.getDescription(),"")))
                .forEach(d->{line(out,"Ngày",d.getDayNumber());line(out,"Hoạt động",d.getTitle());line(out,"Chi tiết",d.getDescription());});
        gears.findByTourId(t.getId()).stream().map(g->Objects.toString(g.getGearName(),"Chưa có tên")+
                (Boolean.TRUE.equals(g.getIsProvided())?" (Đi kèm)":g.getRentalPrice()!=null && g.getRentalPrice().signum()>0?
                        " (Thuê thêm; kiểm tra giá hiện tại)":" (Tự chuẩn bị; chưa xác nhận cho thuê)"))
                .sorted().forEach(g->line(out,"Trang bị",g));
        try { return new Snapshot(out.toString(),HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest((VERSION+"\n"+out).getBytes(StandardCharsets.UTF_8)))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static void line(StringBuilder out,String label,Object value) {
        String text=value instanceof BigDecimal n?n.stripTrailingZeros().toPlainString():Objects.toString(value,"");
        out.append(label).append(": ").append(text.isBlank()?"Chưa có thông tin":text).append('\n');
    }
}
