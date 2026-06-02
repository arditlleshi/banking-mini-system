package com.ardit.banking.security.user.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import com.ardit.banking.security.user.domain.UserTheme;
import com.ardit.banking.security.user.dto.CreateUserRequest;
import com.ardit.banking.security.user.dto.UpdateCurrentUserRequest;
import com.ardit.banking.security.user.dto.UserResponse;
import com.ardit.banking.security.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        String username = request.username().trim();
        String email = request.email().trim();

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        UserEntity user = UserEntity.create(
            username,
            email,
            request.fullName(),
            passwordEncoder.encode(request.password()),
            request.phone(),
            request.address(),
            defaultTheme(request.theme()),
            UserRole.USER
        );

        try {
            return toResponse(userRepository.save(user));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Username or email is already in use",
                exception
            );
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .map(UserService::toResponse)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Transactional
    public UserResponse updateCurrentUser(String username, UpdateCurrentUserRequest request) {
        UserEntity user = userRepository.findByUsername(username)
            .filter(existingUser -> Boolean.TRUE.equals(existingUser.getActive()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        String email = request.email().trim();

        if (userRepository.existsByEmailAndIdNot(email, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        user.updateProfile(
            request.fullName(),
            email,
            request.phone(),
            request.address(),
            request.theme()
        );

        return toResponse(user);
    }

    private static UserTheme defaultTheme(UserTheme theme) {
        return theme == null ? UserTheme.LIGHT : theme;
    }

    private static UserResponse toResponse(UserEntity user) {
        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getUsername(),
            user.getEmail(),
            user.getPhone(),
            user.getAddress(),
            Boolean.TRUE.equals(user.getActive()),
            user.getRole().name(),
            user.getTheme().name(),
            user.getCreatedAt()
        );
    }
}
