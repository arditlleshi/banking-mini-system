package com.ardit.banking.security.auth;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.security.auth.dto.AuthTokensResponse;
import com.ardit.banking.security.auth.dto.LoginRequest;
import com.ardit.banking.security.auth.dto.RefreshTokenRequest;
import com.ardit.banking.security.auth.service.RefreshTokenService;
import com.ardit.banking.security.jwt.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
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
            return ResponseEntity.ok(new AuthTokensResponse(accessToken, refreshToken));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthTokensResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            String username = refreshTokenService.extractUsername(request.refreshToken());
            String newAccessToken = jwtService.generateToken(username);
            String newRefreshToken = refreshTokenService.rotateRefreshToken(request.refreshToken());
            return ResponseEntity.ok(new AuthTokensResponse(newAccessToken, newRefreshToken));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            refreshTokenService.revokeRefreshToken(request.refreshToken());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
}
