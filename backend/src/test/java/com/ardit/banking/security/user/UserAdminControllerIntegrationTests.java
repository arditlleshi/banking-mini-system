package com.ardit.banking.security.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import com.ardit.banking.security.user.dto.UserResponse;
import com.ardit.banking.security.user.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:user-admin-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class UserAdminControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void createsUserForAdminRequests() throws Exception {
        String responseBody = mockMvc.perform(
                post("/api/admin/users")
                    .with(user("admin").roles("ADMIN"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Doe",
                          "username": "jane.doe",
                          "password": "secretpass123",
                          "email": "jane.doe@example.com"
                        }
                        """)
            )
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        UserResponse response = objectMapper.readValue(responseBody, UserResponse.class);
        UserEntity createdUser = userRepository.findByUsername("jane.doe").orElseThrow();

        assertThat(response.id()).isNotNull();
        assertThat(response.fullName()).isEqualTo("Jane Doe");
        assertThat(response.username()).isEqualTo("jane.doe");
        assertThat(response.email()).isEqualTo("jane.doe@example.com");
        assertThat(response.active()).isTrue();
        assertThat(response.role()).isEqualTo("USER");
        assertThat(response.createdAt()).isNotNull();

        assertThat(createdUser.getFullName()).isEqualTo("Jane Doe");
        assertThat(createdUser.getEmail()).isEqualTo("jane.doe@example.com");
        assertThat(createdUser.getActive()).isTrue();
        assertThat(createdUser.getRole()).isEqualTo(UserRole.USER);
        assertThat(createdUser.getPasswordHash()).isNotEqualTo("secretpass123");
        assertThat(passwordEncoder.matches("secretpass123", createdUser.getPasswordHash())).isTrue();
        assertThat(createdUser.getBaseNumber()).isNull();
    }

    @Test
    void rejectsDuplicateUsername() throws Exception {
        userRepository.save(UserEntity.create(
            "jane.doe",
            "existing@example.com",
            "Existing User",
            passwordEncoder.encode("secretpass123"),
            UserRole.USER
        ));

        mockMvc.perform(
                post("/api/admin/users")
                    .with(user("admin").roles("ADMIN"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Doe",
                          "username": "jane.doe",
                          "password": "secretpass123",
                          "email": "jane.doe@example.com"
                        }
                        """)
            )
            .andExpect(status().isConflict());
    }

    @Test
    void rejectsDuplicateEmail() throws Exception {
        userRepository.save(UserEntity.create(
            "existing-user",
            "jane.doe@example.com",
            "Existing User",
            passwordEncoder.encode("secretpass123"),
            UserRole.USER
        ));

        mockMvc.perform(
                post("/api/admin/users")
                    .with(user("admin").roles("ADMIN"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Doe",
                          "username": "jane.doe",
                          "password": "secretpass123",
                          "email": "jane.doe@example.com"
                        }
                        """)
            )
            .andExpect(status().isConflict());
    }

    @Test
    void rejectsNonAdminRequests() throws Exception {
        mockMvc.perform(
                post("/api/admin/users")
                    .with(user("standard-user").roles("USER"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Doe",
                          "username": "jane.doe",
                          "password": "secretpass123",
                          "email": "jane.doe@example.com"
                        }
                        """)
            )
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(
                post("/api/admin/users")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Doe",
                          "username": "jane.doe",
                          "password": "secretpass123",
                          "email": "jane.doe@example.com"
                        }
                        """)
            )
            .andExpect(status().isUnauthorized());
    }
}
