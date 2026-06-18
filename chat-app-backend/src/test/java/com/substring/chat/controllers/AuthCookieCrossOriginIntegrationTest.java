package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the cross-origin / desktop cookie configuration (Bug 2 fix):
 * when {@code cookie.same-site=None}, the auth cookies must be issued with
 * {@code SameSite=None} and {@code Secure} (browsers reject None without Secure),
 * so the refresh cookie is sent on cross-site requests and sessions survive reload.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {"cookie.same-site=None", "cookie.secure=false"})
class AuthCookieCrossOriginIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void login_setsSameSiteNoneAndForcesSecure() throws Exception {
        registerAndVerify("Cross Origin", "crossorigin@example.com", "securepass");

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("crossorigin@example.com");
        loginRequest.setPassword("securepass");

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        List<String> cookies = result.getResponse().getHeaders("Set-Cookie");
        // Even though cookie.secure=false, SameSite=None forces Secure on so the
        // cookie is not silently dropped by browsers.
        assertThat(cookies).anySatisfy(c -> assertThat(c)
                .contains("token=").contains("SameSite=None").contains("Secure"));
        assertThat(cookies).anySatisfy(c -> assertThat(c)
                .contains("refreshToken=").contains("SameSite=None").contains("Secure"));
    }

    private void registerAndVerify(String displayName, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName(displayName);
        request.setEmail(email);
        request.setPassword(password);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after registration"));

        VerifyEmailOtpRequest verifyRequest = new VerifyEmailOtpRequest();
        verifyRequest.setEmail(email);
        verifyRequest.setCode(user.getEmailVerificationToken());

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk());
    }
}
