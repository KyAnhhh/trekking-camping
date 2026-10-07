package com.trekkingcamping.backend.config;

import jakarta.servlet.MultipartConfigElement;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.*;
import org.springframework.util.unit.DataSize;

@Configuration
public class UploadConfig {
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        var factory = new MultipartConfigFactory();
        factory.setMaxFileSize(DataSize.ofMegabytes(5)); factory.setMaxRequestSize(DataSize.ofMegabytes(6));
        return factory.createMultipartConfig();
    }
}
