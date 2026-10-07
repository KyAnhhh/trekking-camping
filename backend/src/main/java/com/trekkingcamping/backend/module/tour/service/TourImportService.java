package com.trekkingcamping.backend.module.tour.service;

import com.fasterxml.jackson.databind.*;
import com.trekkingcamping.backend.module.tour.dto.*;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;

@Service
public class TourImportService {
    public record Entry(CreateTourRequestDto tour, List<CreateItineraryRequestDto> itineraries,
                        List<CreateScheduleRequestDto> schedules, List<CreateGearRequestDto> gears) {}
    public record Imported(Long id, String title, String slug) {}
    public record Result(int count, List<Imported> tours) {}
    private final ObjectMapper json;
    private final TourRepository repository;
    private final TourService tours;
    public TourImportService(ObjectMapper json, TourRepository repository, TourService tours) {
        this.json = json.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS);
        this.repository = repository; this.tours = tours;
    }

    @Transactional(rollbackFor = Exception.class)
    public Result importFile(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 1024 * 1024 || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".json")) {
            throw new IllegalArgumentException("Chọn file JSON theo mẫu, tối đa 1 MB.");
        }
        List<Entry> entries;
        try { entries = json.readValue(file.getBytes(), json.getTypeFactory().constructCollectionType(List.class, Entry.class)); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalArgumentException("File JSON sai cấu trúc hoặc kiểu dữ liệu. Hãy dùng file mẫu, không thêm trường id hoặc status.");
        }
        if (entries == null || entries.isEmpty() || entries.size() > 50) throw new IllegalArgumentException("Mỗi file phải có từ 1 đến 50 tour.");
        Set<String> slugs = new HashSet<>();
        // Validate the complete batch before the first write; any later DB failure rolls back the batch.
        for (int i = 0; i < entries.size(); i++) {
            try {
                Entry entry = entries.get(i);
                if (entry == null) throw new IllegalArgumentException("Thiếu dữ liệu tour.");
                TourValidation.tour(entry.tour());
                if (!slugs.add(entry.tour().getSlug()) || repository.existsBySlug(entry.tour().getSlug())) throw new IllegalArgumentException("Slug đã có trong hệ thống hoặc bị trùng trong file.");
                Set<Integer> days = new HashSet<>();
                for (var r : list(entry.itineraries())) {
                    TourValidation.itinerary(r, entry.tour().getDurationDays());
                    if (!days.add(r.getDayNumber())) throw new IllegalArgumentException("Trùng ngày lịch trình.");
                }
                Set<java.time.LocalDate> departures = new HashSet<>();
                for (var r : list(entry.schedules())) {
                    TourValidation.schedule(r, entry.tour().getMaxCapacity());
                    if (r.getGuideAssignments() != null) com.trekkingcamping.backend.module.guide.service.GuideService.validateAssignments(r.getGuideAssignments());
                    if (!departures.add(r.getDepartureDate())) throw new IllegalArgumentException("Trùng ngày khởi hành.");
                }
                for (var r : list(entry.gears())) TourValidation.gear(r);
            } catch (IllegalArgumentException e) { throw new IllegalArgumentException("Tour thứ " + (i + 1) + ": " + e.getMessage()); }
        }
        List<Imported> imported = new ArrayList<>();
        for (Entry e : entries) {
            var tour = tours.createTour(e.tour());
            for (var r : list(e.itineraries())) tours.addItinerary(tour.getId(), r);
            for (var r : list(e.schedules())) tours.addSchedule(tour.getId(), r);
            for (var r : list(e.gears())) tours.addGear(tour.getId(), r);
            imported.add(new Imported(tour.getId(), tour.getTitle(), tour.getSlug()));
        }
        return new Result(imported.size(), imported);
    }
    private <T> List<T> list(List<T> list) {
        if (list != null && list.size() > 365) throw new IllegalArgumentException("Mỗi danh sách con tối đa 365 mục.");
        return list == null ? List.of() : list;
    }
}
