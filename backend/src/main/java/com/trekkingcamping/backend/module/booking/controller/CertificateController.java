package com.trekkingcamping.backend.module.booking.controller;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.booking.dto.CertificateDto;
import com.trekkingcamping.backend.module.booking.service.CertificateService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @GetMapping("/api/bookings/{id}/certificates")
    public ApiResponse<List<CertificateDto>> getCertificates(
            @AuthenticationPrincipal String email,
            @PathVariable Long id
    ) {
        ApiResponse<List<CertificateDto>> response = new ApiResponse<>();
        response.setData(certificateService.getCertificatesForBooking(email, id, false));
        return response;
    }

    @GetMapping("/api/admin/bookings/{id}/certificates")
    public ApiResponse<List<CertificateDto>> getCertificatesAdmin(
            @AuthenticationPrincipal String email,
            @PathVariable Long id
    ) {
        ApiResponse<List<CertificateDto>> response = new ApiResponse<>();
        response.setData(certificateService.getCertificatesForBooking(email, id, true));
        return response;
    }

    @GetMapping("/api/certificates/verify/{code}")
    public ApiResponse<CertificateDto> verifyCertificate(@PathVariable String code) {
        ApiResponse<CertificateDto> response = new ApiResponse<>();
        response.setData(certificateService.verifyCertificate(code));
        return response;
    }
}
