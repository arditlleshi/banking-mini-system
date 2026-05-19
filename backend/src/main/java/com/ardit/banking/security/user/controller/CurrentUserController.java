package com.ardit.banking.security.user.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.security.user.dto.UserResponse;
import com.ardit.banking.security.user.service.UserService;

@RestController
@RequestMapping("/api/users/me")
public class CurrentUserController {

    private final UserService userService;

    public CurrentUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserResponse getCurrentUser(@AuthenticationPrincipal UserDetails user) {
        return userService.getUserByUsername(user.getUsername());
    }
}
