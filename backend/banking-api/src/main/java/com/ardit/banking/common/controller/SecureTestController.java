package com.ardit.banking.common.controller;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecureTestController {

    @GetMapping("/api/secure/me")
    public Map<String, Object> currentUser(@AuthenticationPrincipal UserDetails user) {
        return Map.of(
            "username", user.getUsername(),
            "authorities", user.getAuthorities()
        );
    }
}
