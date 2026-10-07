package com.trekkingcamping.backend.module.tour.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.service.*;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
public class TourImageController {
    private final TourImageService service;
    private final TourImageStorage storage;
    public TourImageController(TourImageService service, TourImageStorage storage) { this.service = service; this.storage = storage; }
    @GetMapping("/api/tours/{tourId}/images")
    public ApiResponse<List<TourImageService.ImageDto>> list(@PathVariable Long tourId) { return response(service.list(tourId)); }
    @PostMapping("/api/tours/{tourId}/images")
    public ApiResponse<TourImageService.ImageDto> upload(@PathVariable Long tourId, @RequestParam("file") MultipartFile file) throws IOException { return response(service.upload(tourId, file)); }
    @PostMapping("/api/tours/{tourId}/images/{imageId}/cover")
    public ApiResponse<Void> cover(@PathVariable Long tourId, @PathVariable Long imageId) { service.cover(tourId, imageId); return response(null); }
    @DeleteMapping("/api/tours/{tourId}/images/{imageId}")
    public ApiResponse<Void> delete(@PathVariable Long tourId, @PathVariable Long imageId) { service.delete(tourId, imageId); return response(null); }
    @GetMapping("/api/media/tours/{name}")
    public ResponseEntity<Resource> read(@PathVariable String name) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1))).body(storage.read(name));
    }
    private <T> ApiResponse<T> response(T value) { return new ApiResponse<>(1000, "Thành công", value); }
}
