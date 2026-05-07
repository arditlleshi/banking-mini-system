package com.ardit.banking.common.controller;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public Map<String, Object> test() {
        return Map.of(
            "status", "ok",
            "message", "Backend is running",
            "items", List.of(
                Map.of("id", 1, "name", "Savings Account"),
                Map.of("id", 2, "name", "Checking Account"),
                Map.of("id", 3, "name", "Credit Card")
            )
        );
    }
}
