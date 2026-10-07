package com.trekkingcamping.backend.module.ingestion.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.ingestion.service.IngestionService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/data")
public class IngestionController {

    private final IngestionService ingestionService;

    public IngestionController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/ingest")
    public ApiResponse<String> ingestData() {
        ingestionService.ingestTrekkingData();
        
        ApiResponse<String> apiResponse = new ApiResponse<>();
        apiResponse.setData("Nạp dữ liệu cẩm nang thành công vào Vector Store!");
        
        return apiResponse;
    }
}