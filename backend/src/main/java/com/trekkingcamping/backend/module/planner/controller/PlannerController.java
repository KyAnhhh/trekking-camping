package com.trekkingcamping.backend.module.planner.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.planner.dto.PlanDtos.*;
import com.trekkingcamping.backend.module.planner.service.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.List;
@RestController
@RequestMapping("/api/plans")
public class PlannerController {
    private final PlannerService generator; private final PlanStore store;
    public PlannerController(PlannerService generator, PlanStore store) { this.generator = generator; this.store = store; }
    @PostMapping public ApiResponse<Detail> generate(@AuthenticationPrincipal String email, @RequestBody Request input) {
        return new ApiResponse<>(1000, "Đã tạo và lưu lịch trình gợi ý", generator.generate(email, input));
    }
    @GetMapping public ApiResponse<List<Summary>> list(@AuthenticationPrincipal String email) { return new ApiResponse<>(1000,"Thành công",store.list(email)); }
    @GetMapping("/{id}") public ApiResponse<Detail> detail(@AuthenticationPrincipal String email, @PathVariable Long id) { return new ApiResponse<>(1000,"Thành công",store.get(email,id)); }
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@AuthenticationPrincipal String email, @PathVariable Long id) { store.delete(email,id); return new ApiResponse<>(1000,"Đã xóa lịch trình",null); }
}
