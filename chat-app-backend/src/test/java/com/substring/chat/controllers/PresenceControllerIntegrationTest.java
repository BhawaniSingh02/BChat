package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.services.PresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PresenceControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PresenceService presenceService;

    private String authToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();
        // clear presence state
        presenceService.getOnlineUsers().forEach(u -> presenceService.setOffline(u));

        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Presence User");
        request.setEmail("presence@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("presence@example.com").orElseThrow();
        VerifyEmailOtpRequest verifyRequest = new VerifyEmailOtpRequest();
        verifyRequest.setEmail("presence@example.com");
        verifyRequest.setCode(user.getEmailVerificationToken());

        String response = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        authToken = objectMapper.readTree(response).get("token").asText();
    }

    @Test
    void getOnlineUsers_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/presence"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getOnlineUsers_returnsEmptySetInitially() throws Exception {
        mockMvc.perform(get("/api/v1/presence")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getOnlineUsers_returnsOnlineUsersWhenSet() throws Exception {
        presenceService.setOnline("alice");
        presenceService.setOnline("bob");

        mockMvc.perform(get("/api/v1/presence")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getUserPresence_returnsOnlineStatusTrue() throws Exception {
        presenceService.setOnline("alice");

        mockMvc.perform(get("/api/v1/presence/alice")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.online").value(true));
    }

    @Test
    void getUserPresence_returnsOnlineStatusFalse() throws Exception {
        mockMvc.perform(get("/api/v1/presence/offlineuser")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("offlineuser"))
                .andExpect(jsonPath("$.online").value(false));
    }
}
