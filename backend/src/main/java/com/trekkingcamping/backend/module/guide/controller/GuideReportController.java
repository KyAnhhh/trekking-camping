package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.guide.service.GuideReportService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
public class GuideReportController {
 public record Review(String note) {}
 private final GuideReportService service;public GuideReportController(GuideReportService s){service=s;}
 @GetMapping("/api/guide-workspace/trips/{id}/report") public ApiResponse<?> get(@AuthenticationPrincipal String e,@PathVariable Long id){return ok(service.mine(e,id));}
 @PostMapping("/api/guide-workspace/trips/{id}/report") public ApiResponse<?> submit(@AuthenticationPrincipal String e,@PathVariable Long id,@RequestBody GuideReportService.Input input){service.submit(e,id,input);return ok(null);}
 @GetMapping("/api/admin/guide-reports") public ApiResponse<?> list(@AuthenticationPrincipal String e,@RequestParam(defaultValue="0") int page){return ok(service.list(e,page));}
 @PutMapping("/api/admin/guide-reports/{id}") public ApiResponse<?> review(@AuthenticationPrincipal String e,@PathVariable Long id,@RequestBody Review input){service.review(e,id,input.note());return ok(null);}
 private ApiResponse<?> ok(Object d){return new ApiResponse<>(1000,"Thành công",d);}
}
