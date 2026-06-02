package com.ardit.banking.security.user.dto;

import java.time.Instant;

public record UserResponse(
    Long id,
    String fullName,
    String username,
    String email,
    String phone,
    String address,
    boolean active,
    String role,
    String theme,
    Instant createdAt
) {
}
