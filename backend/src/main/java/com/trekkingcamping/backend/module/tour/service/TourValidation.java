package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.tour.dto.*;
import java.time.LocalDate;
import java.time.ZoneId;

public final class TourValidation {
    private TourValidation() {}
    public static void tour(CreateTourRequestDto r) {
        if (r == null) fail("Thiếu thông tin tour.");
        adventure(r.getAdventureProfile());
        text(r.getTitle(), 255, "Tên tour"); text(r.getLocation(), 255, "Địa điểm");
        if (r.getSlug() == null || r.getSlug().length() > 200 || !r.getSlug().matches("[a-z0-9]+(-[a-z0-9]+)*")) fail("Slug phải là chữ thường không dấu, số và dấu gạch ngang.");
        if (r.getDurationDays() == null || r.getDurationDays() < 1 || r.getDurationDays() > 365
                || r.getDurationNights() == null || r.getDurationNights() < 0 || r.getDurationNights() > r.getDurationDays()) fail("Số ngày/đêm không hợp lệ.");
        if (r.getDifficultyLevel() == null || r.getDifficultyLevel() < 1 || r.getDifficultyLevel() > 3) fail("Độ khó phải từ 1 đến 3.");
        if (r.getMaxCapacity() == null || r.getMaxCapacity() < 1 || r.getMaxCapacity() > 1000) fail("Sức chứa phải từ 1 đến 1.000.");
        if (r.getPricePerPax() == null || r.getPricePerPax().signum() < 0 || r.getPricePerPax().compareTo(new java.math.BigDecimal("1000000000")) > 0
                || r.getPricePerPax().stripTrailingZeros().scale() > 0) fail("Giá tour phải là số nguyên VND không âm, tối đa 1 tỷ đồng.");
        optional(r.getEmergencyHotline(), 100); optional(r.getSummary(), 5000); optional(r.getDescription(), 50000);
        optional(r.getSafetyTips(), 10000); optional(r.getRequiredGear(), 10000); optional(r.getInsuranceInfo(), 10000);
    }
    public static void itinerary(CreateItineraryRequestDto r, int days) {
        if (r == null || r.getDayNumber() == null || r.getDayNumber() < 1 || r.getDayNumber() > days) fail("Ngày lịch trình nằm ngoài thời lượng tour.");
        text(r.getTitle(), 255, "Tiêu đề lịch trình"); optional(r.getDescription(), 20000);
    }
    public static void schedule(CreateScheduleRequestDto r, int capacity) {
        if (r == null || r.getDepartureDate() == null || r.getReturnDate() == null
                || !r.getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                || r.getReturnDate().isBefore(r.getDepartureDate())) fail("Lịch khởi hành phải từ ngày mai, ngày về không trước ngày đi.");
        if (r.getAvailableSlots() != null && (r.getAvailableSlots() < 1 || r.getAvailableSlots() > capacity)) fail("Số chỗ phải từ 1 đến sức chứa tối đa của tour.");
        optional(r.getGuideName(), 255); optional(r.getGuidePhone(), 100);
        pickup(r.getPickupAt(),r.getPickupPoint(),r.getDepartureDate());
    }
    public static void gear(CreateGearRequestDto r) {
        if (r == null) fail("Thiếu thông tin trang bị.");
        text(r.getGearName(), 255, "Tên trang bị");
        if (r.getIsProvided() == null || r.getRentalPrice() == null || r.getRentalPrice().signum() < 0) fail("Giá thuê và hình thức cung cấp không hợp lệ.");
    }
    private static void text(String value, int max, String field) {
        if (value == null || value.isBlank() || value.length() > max) fail(field + " bắt buộc, tối đa " + max + " ký tự.");
    }
    private static void optional(String value, int max) { if (value != null && value.length() > max) fail("Nội dung vượt quá " + max + " ký tự."); }
    public static void adventure(com.trekkingcamping.backend.module.tour.entity.AdventureProfile p) {
        if (p == null) return;
        range(p.getDistanceKm(), 1000); range(p.getActiveHoursPerDay(), 24); range(p.getMedicalAccessHours(), 168);
        if (p.getMaxAltitudeM()!=null && (p.getMaxAltitudeM()<0 || p.getMaxAltitudeM()>9000)
                || p.getTotalAscentM()!=null && (p.getTotalAscentM()<0 || p.getTotalAscentM()>100000)
                || p.getCustomersPerGuide()!=null && (p.getCustomersPerGuide()<1 || p.getCustomersPerGuide()>1000)) fail("Thông số hành trình nằm ngoài giới hạn.");
        optional(p.getMedicalAccessNotes(),2000); optional(p.getPickupNotes(),2000); optional(p.getAssemblyPoint(),255);
        optional(p.getParticipationRequirements(),5000); optional(p.getSourceNote(),2000);
        if (p.getRecommendedMonths()!=null && !p.getRecommendedMonths().isBlank()
                && !p.getRecommendedMonths().matches("(?:[1-9]|1[0-2])(?:,(?:[1-9]|1[0-2])){0,11}")) fail("Tháng khuyến nghị là các số 1–12, phân cách bằng dấu phẩy.");
        if (p.getVerifiedOn()!=null && p.getVerifiedOn().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))) fail("Ngày xác minh không được ở tương lai.");
        if (p.getMedicalAccessHours()!=null && (p.getMedicalAccessNotes()==null || p.getMedicalAccessNotes().isBlank())) fail("Cần mô tả điều kiện ước tính tiếp cận y tế.");
        boolean hasFacts = p.getDistanceKm()!=null || p.getMaxAltitudeM()!=null || p.getTotalAscentM()!=null
                || p.getActiveHoursPerDay()!=null || p.getMedicalAccessHours()!=null || p.getCustomersPerGuide()!=null
                || p.getParticipationRequirements()!=null && !p.getParticipationRequirements().isBlank();
        if (hasFacts && (p.getSourceNote()==null || p.getSourceNote().isBlank() || p.getVerifiedOn()==null)) fail("Thông số/yêu cầu tour cần nguồn hoặc người xác nhận và ngày xác minh.");
    }
    private static void range(java.math.BigDecimal n, int max) {
        if (n!=null && (n.signum()<0 || n.compareTo(java.math.BigDecimal.valueOf(max))>0 || n.stripTrailingZeros().scale()>2)) fail("Thông số phải không âm, tối đa 2 chữ số thập phân và trong giới hạn.");
    }
    public static void pickup(java.time.LocalDateTime at,String point,LocalDate departure) {
        optional(point,500);
        if(at==null && (point==null || point.isBlank()))return;
        if(at==null || point==null || point.isBlank() || departure==null || at.toLocalDate().isAfter(departure)
                || at.toLocalDate().isBefore(departure.minusDays(2))) fail("Nhập đủ thời điểm và điểm đón; thời điểm đón trong ngày khởi hành hoặc tối đa hai ngày trước đó (giờ Việt Nam).");
    }
    private static void fail(String message) { throw new IllegalArgumentException(message); }
}
