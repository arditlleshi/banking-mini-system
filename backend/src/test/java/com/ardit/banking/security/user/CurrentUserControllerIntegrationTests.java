package com.ardit.banking.security.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.ardit.banking.security.user.domain.UserTheme;
import com.ardit.banking.security.user.dto.UserResponse;
import com.ardit.banking.security.user.repository.UserRepository;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:current-user-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class CurrentUserControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void returnsCurrentUserProfile() throws Exception {
        userRepository.save(UserEntity.create(
            "jane.doe",
            "jane.doe@example.com",
            "Jane Doe",
            passwordEncoder.encode("secretpass123"),
            "+355 69 123 4567",
            "42 Banking Street, Tirane",
            UserTheme.DARK,
            UserRole.USER
        ));

        String responseBody = mockMvc.perform(
                get("/api/users/me")
                    .with(user("jane.doe").roles("USER"))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        UserResponse response = objectMapper.readValue(responseBody, UserResponse.class);

        assertThat(response.username()).isEqualTo("jane.doe");
        assertThat(response.fullName()).isEqualTo("Jane Doe");
        assertThat(response.email()).isEqualTo("jane.doe@example.com");
        assertThat(response.phone()).isEqualTo("+355 69 123 4567");
        assertThat(response.address()).isEqualTo("42 Banking Street, Tirane");
        assertThat(response.theme()).isEqualTo("DARK");
    }

    @Test
    void updatesCurrentUserProfile() throws Exception {
        userRepository.save(UserEntity.create(
            "jane.doe",
            "jane.doe@example.com",
            "Jane Doe",
            passwordEncoder.encode("secretpass123"),
            null,
            null,
            UserTheme.LIGHT,
            UserRole.USER
        ));

        String responseBody = mockMvc.perform(
                put("/api/users/me")
                    .with(user("jane.doe").roles("USER"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Updated",
                          "email": "jane.updated@example.com",
                          "phone": "+355 68 987 6543",
                          "address": "99 Profile Avenue, Tirane",
                          "theme": "DARK"
                        }
                        """)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        UserResponse response = objectMapper.readValue(responseBody, UserResponse.class);
        UserEntity updatedUser = userRepository.findByUsername("jane.doe").orElseThrow();

        assertThat(response.fullName()).isEqualTo("Jane Updated");
        assertThat(response.email()).isEqualTo("jane.updated@example.com");
        assertThat(response.phone()).isEqualTo("+355 68 987 6543");
        assertThat(response.address()).isEqualTo("99 Profile Avenue, Tirane");
        assertThat(response.theme()).isEqualTo("DARK");

        assertThat(updatedUser.getFullName()).isEqualTo("Jane Updated");
        assertThat(updatedUser.getEmail()).isEqualTo("jane.updated@example.com");
        assertThat(updatedUser.getPhone()).isEqualTo("+355 68 987 6543");
        assertThat(updatedUser.getAddress()).isEqualTo("99 Profile Avenue, Tirane");
        assertThat(updatedUser.getTheme()).isEqualTo(UserTheme.DARK);
    }

    @Test
    void rejectsCurrentUserUpdateWhenEmailBelongsToAnotherUser() throws Exception {
        userRepository.save(UserEntity.create(
            "jane.doe",
            "jane.doe@example.com",
            "Jane Doe",
            passwordEncoder.encode("secretpass123"),
            null,
            null,
            UserTheme.LIGHT,
            UserRole.USER
        ));
        userRepository.save(UserEntity.create(
            "another.user",
            "existing@example.com",
            "Another User",
            passwordEncoder.encode("secretpass123"),
            null,
            null,
            UserTheme.LIGHT,
            UserRole.USER
        ));

        mockMvc.perform(
                put("/api/users/me")
                    .with(user("jane.doe").roles("USER"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "fullName": "Jane Updated",
                          "email": "existing@example.com",
                          "phone": "+355 68 987 6543",
                          "address": "99 Profile Avenue, Tirane",
                          "theme": "DARK"
                        }
                        """)
            )
            .andExpect(status().isConflict());
    }
}
