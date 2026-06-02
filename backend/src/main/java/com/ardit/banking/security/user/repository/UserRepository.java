package com.ardit.banking.security.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ardit.banking.security.user.domain.UserEntity;

import jakarta.persistence.LockModeType;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByUsername(String username);

    Optional<UserEntity> findByUsername(String username);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserEntity> findByUsernameAndActiveTrue(String username);

    boolean existsByBaseNumber(String baseNumber);
}
