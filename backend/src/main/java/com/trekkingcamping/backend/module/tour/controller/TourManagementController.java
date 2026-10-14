package com.trekkingcamping.backend.module.tour.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.service.*;
import com.trekkingcamping.backend.module.tour.dto.CreateTourRequestDto;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/admin/tours")
public class TourManagementController {
    private final TourManagementService service; private final TourImageService images;
    public TourManagementController(TourManagementService service, TourImageService images) { this.service=service; this.images=images; }
    @GetMapping public ApiResponse<List<Tour>> list() { return ok(service.list()); }
    @GetMapping("/{slug}") public ApiResponse<TourManagementService.Detail> detail(@PathVariable String slug) { return ok(service.detail(slug)); }
    @PutMapping("/{id}") public ApiResponse<Tour> update(@PathVariable Long id,@RequestBody CreateTourRequestDto input) { return ok(service.update(id,input)); }
    @PutMapping("/{id}/active") public ApiResponse<Tour> active(@PathVariable Long id,@RequestBody TourManagementService.Active input) { return ok(service.active(id,input)); }
    @PutMapping("/{tourId}/schedules/{scheduleId}") public ApiResponse<Void> schedule(@PathVariable Long tourId,@PathVariable Long scheduleId,@RequestBody TourManagementService.ScheduleEdit input) {
        service.updateSchedule(tourId,scheduleId,input); return ok(null);
    }
    @GetMapping("/{id}/images") public ApiResponse<List<TourImageService.ImageDto>> images(@PathVariable Long id) { return ok(images.adminList(id)); }
    private <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(1000,"Thành công",data); }
}
