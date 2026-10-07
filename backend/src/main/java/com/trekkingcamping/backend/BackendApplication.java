package com.trekkingcamping.backend;

import com.trekkingcamping.backend.config.LocalEnvironment;

import org.springframework.ai.autoconfigure.openai.OpenAiAutoConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = {OpenAiAutoConfiguration.class}, scanBasePackages = "com.trekkingcamping.backend")
public class BackendApplication {

    public static void main(String[] args) {
        LocalEnvironment.load();

        SpringApplication.run(BackendApplication.class, args);
    }

}