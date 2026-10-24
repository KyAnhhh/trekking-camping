package com.trekkingcamping.backend.module.tour.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.service.FavoriteService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/me/favorite-tours")
public class FavoriteController {
    private final FavoriteService service;
    public FavoriteController(FavoriteService service) { this.service = service; }
    @GetMapping public ApiResponse<FavoriteService.Page> list(@AuthenticationPrincipal String email,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="12") int size) {
        return new ApiResponse<>(1000,"Thành công",service.list(email,page,size));
    }
    @GetMapping("/ids") public ApiResponse<List<Long>> ids(@AuthenticationPrincipal String email) {
        return new ApiResponse<>(1000,"Thành công",service.ids(email));
    }
    @PutMapping("/{id}") public ApiResponse<Void> save(@AuthenticationPrincipal String email,@PathVariable long id) {
        service.save(email,id); return new ApiResponse<>(1000,"Đã lưu tour",null);
    }
    @DeleteMapping("/{id}") public ApiResponse<Void> remove(@AuthenticationPrincipal String email,@PathVariable long id) {
        service.remove(email,id); return new ApiResponse<>(1000,"Đã bỏ lưu tour",null);
    }
}
