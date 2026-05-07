package com.ardit.banking.security.auth.dto;

public record AuthTokensResponse(
    String accessToken,
    String refreshToken
) {
}
