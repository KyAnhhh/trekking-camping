package com.trekkingcamping.backend.module.knowledge.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.knowledge.service.KnowledgeService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/knowledge")
public class KnowledgeController {
    private final KnowledgeService knowledgeService;

    public KnowledgeController(KnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @PostMapping("/upload")
    public ApiResponse<Map<String, Object>> uploadDocument(@RequestParam("file") MultipartFile file) throws IOException {
        int chunks = knowledgeService.uploadKnowledgeBase(file);
        ApiResponse<Map<String, Object>> response = new ApiResponse<>();
        response.setData(Map.of(
                "fileName", file.getOriginalFilename(),
                "totalChunksCreated", chunks
        ));
        return response;
    }

    @GetMapping("/files")
    public ApiResponse<List<String>> getAllUploadedFiles() {
        List<String> files = knowledgeService.getAllKnowledgeFiles();
        ApiResponse<List<String>> response = new ApiResponse<>();
        response.setData(files);
        return response;
    }

    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteDocument(@RequestParam("fileName") String fileName) {
        if (!knowledgeService.deleteKnowledgeByFileName(fileName)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu.");
        }
        return new ApiResponse<>();
    }
}
