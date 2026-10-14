package com.trekkingcamping.backend.module.review.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.review.service.ReviewService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
public class ReviewController {
    private final ReviewService service;
    public ReviewController(ReviewService service) { this.service=service; }
    @GetMapping("/api/tours/{tourId}/reviews")
    public ApiResponse<ReviewService.Summary> list(@PathVariable Long tourId,@RequestParam(defaultValue="0") int page) {
        return new ApiResponse<>(1000,"Thành công",service.list(tourId,page));
    }
    @GetMapping("/api/bookings/{id}/review")
    public ApiResponse<ReviewService.Eligibility> eligibility(@AuthenticationPrincipal String email,@PathVariable Long id) {
        return new ApiResponse<>(1000,"Thành công",service.eligibility(email,id));
    }
    @PostMapping("/api/bookings/{id}/review")
    public ApiResponse<ReviewService.Item> create(@AuthenticationPrincipal String email,@PathVariable Long id,@RequestBody ReviewService.Input input) {
        return new ApiResponse<>(1000,"Đã gửi đánh giá",service.create(email,id,input));
    }
}
