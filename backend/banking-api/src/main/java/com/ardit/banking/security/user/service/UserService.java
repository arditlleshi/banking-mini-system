package com.ardit.banking.security.user.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import com.ardit.banking.security.user.dto.CreateUserRequest;
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
        if (userRepository.existsByUsername(request.username().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        if (userRepository.existsByEmail(request.email().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        UserEntity user = UserEntity.create(
            request.username(),
            request.email(),
            request.fullName(),
            passwordEncoder.encode(request.password()),
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

    private static UserResponse toResponse(UserEntity user) {
        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getUsername(),
            user.getEmail(),
            Boolean.TRUE.equals(user.getActive()),
            user.getRole().name(),
            user.getCreatedAt()
        );
    }
}
