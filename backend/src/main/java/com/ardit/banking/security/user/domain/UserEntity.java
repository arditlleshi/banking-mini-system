package com.ardit.banking.security.user.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

import com.ardit.banking.account.domain.AccountEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "full_name", length = 120)
    private String fullName;

    @Column(name = "phone", length = 32)
    private String phone;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    private Boolean active;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false, length = 30)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "theme_preference", nullable = false, length = 20)
    private UserTheme theme = UserTheme.LIGHT;

    @Column(name = "base_number", unique = true, length = 6)
    private String baseNumber;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    private Set<AccountEntity> accounts = new LinkedHashSet<>();

    public UserEntity() {
    }

    public static UserEntity create(String username, String email, String fullName, String passwordHash, UserRole role) {
        return create(username, email, fullName, passwordHash, null, null, null, role);
    }

    public static UserEntity create(String username, String email, String fullName, String passwordHash,
                                    String phone, String address, UserTheme theme, UserRole role) {
        UserEntity user = new UserEntity();
        user.username = normalizeRequiredText(username, "username");
        user.email = normalizeRequiredText(email, "email");
        user.fullName = normalizeRequiredText(fullName, "fullName");
        user.phone = normalizeOptionalText(phone);
        user.address = normalizeOptionalText(address);
        user.passwordHash = normalizeRequiredText(passwordHash, "passwordHash");
        user.active = Boolean.TRUE;
        user.role = Objects.requireNonNull(role, "role must not be null");
        user.theme = theme == null ? UserTheme.LIGHT : theme;
        return user;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Boolean getActive() {
        return active;
    }

    public UserRole getRole() {
        return role;
    }

    public UserTheme getTheme() {
        return theme;
    }

    public String getBaseNumber() {
        return baseNumber;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateProfile(String fullName, String email, String phone, String address, UserTheme theme) {
        this.fullName = normalizeRequiredText(fullName, "fullName");
        this.email = normalizeRequiredText(email, "email");
        this.phone = normalizeOptionalText(phone);
        this.address = normalizeOptionalText(address);
        this.theme = Objects.requireNonNull(theme, "theme must not be null");
    }

    public void assignBaseNumber(String baseNumber) {
        this.baseNumber = normalizeRequiredText(baseNumber, "baseNumber");
    }

    public Set<AccountEntity> getAccounts() {
        return Collections.unmodifiableSet(accounts);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (theme == null) {
            theme = UserTheme.LIGHT;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    private static String normalizeRequiredText(String value, String fieldName) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return normalized;
    }

    private static String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
