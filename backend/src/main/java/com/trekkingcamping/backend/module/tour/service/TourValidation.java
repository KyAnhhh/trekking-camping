package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.tour.dto.*;
import java.time.LocalDate;
import java.time.ZoneId;

public final class TourValidation {
    private TourValidation() {}
    public static void tour(CreateTourRequestDto r) {
        if (r == null) fail("Thiếu thông tin tour.");
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
    private static void fail(String message) { throw new IllegalArgumentException(message); }
}
