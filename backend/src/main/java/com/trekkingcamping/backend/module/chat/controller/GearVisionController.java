package com.trekkingcamping.backend.module.chat.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.chat.dto.GearCheckResultDto;
import com.trekkingcamping.backend.module.chat.service.ChatRateLimit;
import com.trekkingcamping.backend.module.chat.service.GearVisionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai")
public class GearVisionController {

    private final GearVisionService gearVisionService;
    private final ChatRateLimit rateLimit;

    public GearVisionController(GearVisionService gearVisionService, ChatRateLimit rateLimit) {
        this.gearVisionService = gearVisionService;
        this.rateLimit = rateLimit;
    }

    @PostMapping(value = "/gear-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<GearCheckResultDto> checkGear(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long tourId,
            @RequestParam(required = false) Long bookingId,
            @RequestParam(required = false) String notes,
            @RequestParam(defaultValue = "vi") String language,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest) throws IOException {
        String caller = email != null && !email.isBlank() ? email : servletRequest.getRemoteAddr();
        rateLimit.check(caller, "gear-vision", 10);

        GearCheckResultDto result = gearVisionService.inspectGear(file, tourId, bookingId, notes, language, email);
        return new ApiResponse<>(1000, "Thành công", result);
    }
}
