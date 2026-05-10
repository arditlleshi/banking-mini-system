package com.ardit.banking.security.user.domain;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

import com.ardit.banking.account.domain.AccountEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
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

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    private Boolean active;

    @Column(name = "user_role", nullable = false, length = 30)
    private String role;

    @Column(name = "base_number", unique = true, length = 6)
    private String baseNumber;

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    private Set<AccountEntity> accounts = new LinkedHashSet<>();

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

    public String getPasswordHash() {
        return passwordHash;
    }

    public Boolean getActive() {
        return active;
    }

    public String getRole() {
        return role;
    }

    public String getBaseNumber() {
        return baseNumber;
    }

    public void assignBaseNumber(String baseNumber) {
        if (baseNumber == null || baseNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("baseNumber must not be blank");
        }
        this.baseNumber = baseNumber.trim();
    }

    public Set<AccountEntity> getAccounts() {
        return Collections.unmodifiableSet(accounts);
    }
}
