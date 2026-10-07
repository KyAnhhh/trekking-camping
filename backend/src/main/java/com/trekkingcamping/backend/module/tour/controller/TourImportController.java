package com.trekkingcamping.backend.module.tour.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.service.TourImportService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/admin/tours")
public class TourImportController {
    private final TourImportService service;
    public TourImportController(TourImportService service) { this.service = service; }
    @PostMapping("/import")
    public ApiResponse<TourImportService.Result> importTours(@RequestParam("file") MultipartFile file) throws IOException {
        return new ApiResponse<>(1000, "Đã nhập tour vào hệ thống.", service.importFile(file));
    }
}
