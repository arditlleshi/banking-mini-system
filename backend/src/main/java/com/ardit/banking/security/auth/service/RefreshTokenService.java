package com.ardit.banking.security.auth.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ardit.banking.security.auth.domain.RefreshTokenEntity;
import com.ardit.banking.security.auth.repository.RefreshTokenRepository;
import com.ardit.banking.security.jwt.JwtProperties;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, UserRepository userRepository,
                               PasswordEncoder passwordEncoder, JwtProperties jwtProperties) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProperties = jwtProperties;
    }

    @Transactional
    public String createRefreshToken(String username) {
        UserEntity user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String tokenId = randomString(24);
        String tokenSecret = randomString(48);

        RefreshTokenEntity entity = new RefreshTokenEntity();
        entity.setTokenId(tokenId);
        entity.setTokenHash(passwordEncoder.encode(tokenSecret));
        entity.setUser(user);
        entity.setCreatedAt(Instant.now());
        entity.setExpiresAt(Instant.now().plus(jwtProperties.refreshExpirationDays(), ChronoUnit.DAYS));

        refreshTokenRepository.save(entity);
        return tokenId + "." + tokenSecret;
    }

    @Transactional
    public String rotateRefreshToken(String refreshToken) {
        RefreshTokenEntity existing = validateRefreshToken(refreshToken);
        existing.setRevokedAt(Instant.now());
        refreshTokenRepository.save(existing);
        return createRefreshToken(existing.getUser().getUsername());
    }

    @Transactional(readOnly = true)
    public String extractUsername(String refreshToken) {
        RefreshTokenEntity existing = validateRefreshToken(refreshToken);
        return existing.getUser().getUsername();
    }

    @Transactional
    public void revokeRefreshToken(String refreshToken) {
        RefreshTokenEntity existing = validateRefreshToken(refreshToken);
        existing.setRevokedAt(Instant.now());
        refreshTokenRepository.save(existing);
    }

    private RefreshTokenEntity validateRefreshToken(String refreshToken) {
        String[] parts = refreshToken.split("\\.");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid refresh token format");
        }

        String tokenId = parts[0];
        String tokenSecret = parts[1];

        RefreshTokenEntity tokenEntity = refreshTokenRepository.findByTokenId(tokenId)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (tokenEntity.getRevokedAt() != null) {
            throw new IllegalArgumentException("Refresh token revoked");
        }
        if (tokenEntity.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token expired");
        }
        if (!passwordEncoder.matches(tokenSecret, tokenEntity.getTokenHash())) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        return tokenEntity;
    }

    private String randomString(int numBytes) {
        byte[] bytes = new byte[numBytes];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
