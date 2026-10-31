package com.trekkingcamping.backend.module.chat.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.chat.service.AiModels;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.Map;

@RestController
public class AiModelsController {
    private final AiModels models;
    public AiModelsController(AiModels models){this.models=models;}
    private <T> ApiResponse<T> ok(T value){return new ApiResponse<>(1000,"success",value);}
    @GetMapping("/api/chat/models") public ApiResponse<?> available(){return ok(models.available());}
    @GetMapping("/api/admin/ai-models") public ApiResponse<?> configuration(){return ok(models.view());}
    @PutMapping("/api/admin/ai-models") public ApiResponse<?> update(@RequestBody AiModels.Update input,@AuthenticationPrincipal String email){return ok(models.save(input,email));}
    @GetMapping("/api/admin/ai-models/history") public ApiResponse<?> history(){return ok(models.history());}
    public record Restore(long expectedRevision){}
    @PostMapping("/api/admin/ai-models/history/{revision}/restore") public ApiResponse<?> restore(@PathVariable long revision,@RequestBody Restore input,@AuthenticationPrincipal String email){return ok(models.restore(revision,input.expectedRevision(),email));}
    @GetMapping("/api/admin/ai-models/metrics") public ApiResponse<?> metrics(){
        return ok(Map.of(
            "scope","Từ cơ sở dữ liệu hệ thống (lưu trữ thời gian thực); đếm lượt xử lý và nhật ký hoạt động",
            "models",models.metrics(),
            "activities",models.recentActivities(),
            "embedding","TransformersEmbeddingModel (local), PgVectorStore — không thay đổi qua màn hình này"
        ));
    }
}
