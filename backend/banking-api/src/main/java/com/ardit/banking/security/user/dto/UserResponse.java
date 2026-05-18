package com.ardit.banking.security.user.dto;

import java.time.Instant;

public record UserResponse(
    Long id,
    String fullName,
    String username,
    String email,
    boolean active,
    String role,
    Instant createdAt
) {
}
