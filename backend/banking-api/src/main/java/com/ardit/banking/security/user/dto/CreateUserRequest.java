package com.ardit.banking.security.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank @Size(max = 120) String fullName,
    @NotBlank @Size(max = 50) String username,
    @NotBlank @Size(min = 6, max = 72) String password,
    @NotBlank @Email @Size(max = 255) String email
) {
}
