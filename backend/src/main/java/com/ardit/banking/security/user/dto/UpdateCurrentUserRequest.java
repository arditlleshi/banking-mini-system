package com.ardit.banking.security.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.ardit.banking.security.user.domain.UserTheme;

public record UpdateCurrentUserRequest(
    @NotBlank @Size(max = 120) String fullName,
    @NotBlank @Email @Size(max = 255) String email,
    @Size(max = 32) String phone,
    @Size(max = 255) String address,
    @NotNull UserTheme theme
) {
}
