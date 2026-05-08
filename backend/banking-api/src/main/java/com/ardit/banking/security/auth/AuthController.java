package com.ardit.banking.security.auth;

import java.time.Duration;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.security.auth.dto.AuthTokensResponse;
import com.ardit.banking.security.auth.dto.LoginRequest;
import com.ardit.banking.security.auth.service.RefreshTokenService;
import com.ardit.banking.security.jwt.JwtProperties;
import com.ardit.banking.security.jwt.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final JwtProperties jwtProperties;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          RefreshTokenService refreshTokenService, JwtProperties jwtProperties) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthTokensResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
            String username = authentication.getName();

            String accessToken = jwtService.generateToken(username);
            String refreshToken = refreshTokenService.createRefreshToken(username);

            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(new AuthTokensResponse(accessToken));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthTokensResponse> refresh(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .build();
        }

        try {
            String username = refreshTokenService.extractUsername(refreshToken);
            String newAccessToken = jwtService.generateToken(username);
            String newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken);

            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(newRefreshToken).toString())
                .body(new AuthTokensResponse(newAccessToken));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                refreshTokenService.revokeRefreshToken(refreshToken);
            } catch (IllegalArgumentException ignored) {
                // Always clear cookie on logout, even if token is already invalid.
            }
        }

        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
            .build();
    }

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
            .httpOnly(true)
            .secure(false)
            .sameSite("Lax")
            .path("/api/auth")
            .maxAge(Duration.ofDays(jwtProperties.refreshExpirationDays()))
            .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
            .httpOnly(true)
            .secure(false)
            .sameSite("Lax")
            .path("/api/auth")
            .maxAge(Duration.ZERO)
            .build();
    }
}
