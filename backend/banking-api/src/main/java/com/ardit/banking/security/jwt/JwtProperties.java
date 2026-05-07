package com.ardit.banking.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.jwt")
public record JwtProperties(
    String secret,
    long expirationMinutes,
    long refreshExpirationDays
) {
}
