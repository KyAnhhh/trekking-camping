package com.trekkingcamping.backend.module.guide.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.guide.dto.GuideDtos.*;
import com.trekkingcamping.backend.module.guide.service.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.core.io.Resource;
import java.io.IOException;
import java.util.List;

@RestController
public class GuideController {
    private final GuideService service;
    private final GuideImageStorage images;
    private final GuideImportService importer;
    public GuideController(GuideService service, GuideImageStorage images, GuideImportService importer) {
        this.service = service; this.images = images; this.importer = importer;
    }
    @PostMapping(value = "/api/admin/guides/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<GuideImportService.Result> importGuides(@RequestParam("file") MultipartFile file) throws IOException {
        return ok(importer.importFile(file));
    }
    @GetMapping("/api/admin/guides")
    public ApiResponse<List<AdminProfile>> list() { return ok(service.list()); }
    @PostMapping("/api/admin/guides")
    public ApiResponse<AdminProfile> create(@RequestBody Edit request) { return ok(service.create(request)); }
    @PutMapping("/api/admin/guides/{id}")
    public ApiResponse<AdminProfile> update(@PathVariable Long id, @RequestBody Edit request) { return ok(service.update(id, request)); }
    @PostMapping("/api/admin/guides/{id}/avatar")
    public ApiResponse<AdminProfile> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException { return ok(service.upload(id, file)); }
    @GetMapping("/api/admin/schedules/{id}/guides")
    public ApiResponse<Team> team(@PathVariable Long id) { return ok(service.team(id)); }
    @PutMapping("/api/admin/schedules/{id}/guides")
    public ApiResponse<Team> assign(@PathVariable Long id, @RequestBody List<Assignment> request,@RequestParam(defaultValue="Cập nhật phân công") String reason) { return ok(service.assign(id, request,reason)); }
    @GetMapping("/api/guides/{id}")
    public ApiResponse<PublicProfile> profile(@PathVariable Long id) { return ok(service.profile(id)); }
    @GetMapping("/api/media/guides/{name}")
    public ResponseEntity<Resource> image(@PathVariable String name) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1))).body(images.read(name));
    }
    private <T> ApiResponse<T> ok(T value) { return new ApiResponse<>(1000, "Thành công", value); }
}
