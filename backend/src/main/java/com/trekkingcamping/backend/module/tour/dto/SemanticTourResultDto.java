package com.trekkingcamping.backend.module.tour.dto;

import com.trekkingcamping.backend.module.tour.entity.Tour;
import java.util.List;

public record SemanticTourResultDto(
        Tour tour,
        double relevanceScore,
        String matchType,
        List<String> matchedReasons
) {}
