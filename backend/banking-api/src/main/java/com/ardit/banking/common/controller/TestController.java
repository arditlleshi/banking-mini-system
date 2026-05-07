package com.ardit.banking.common.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public Map<String, String> test() {
        return Map.of("status", "ok", "message", "Backend is running");
    }
}

