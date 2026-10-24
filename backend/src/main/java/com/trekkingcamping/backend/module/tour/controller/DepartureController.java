package com.trekkingcamping.backend.module.tour.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.tour.service.DepartureService;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/tours/departures")
public class DepartureController {
    private final DepartureService service;
    public DepartureController(DepartureService service){this.service=service;}
    @GetMapping public ApiResponse<DepartureService.Result> list(
        @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="") String location,@RequestParam(required=false) Integer difficulty,
        @RequestParam(defaultValue="1") int people,@RequestParam(defaultValue="true") boolean availableOnly) {
        return new ApiResponse<>(1000,"Thành công",service.list(from,to,location,difficulty,people,availableOnly));
    }
}
