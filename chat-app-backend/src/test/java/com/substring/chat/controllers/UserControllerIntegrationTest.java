package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.repositories.UserRepository;
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
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private String authToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();
        authToken = registerAndGetToken("searchuser", "search@example.com", "password123");
        registerAndGetToken("alice", "alice@example.com", "password123");
        registerAndGetToken("alicia", "alicia@example.com", "password123");
    }

    private String registerAndGetToken(String username, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);

        String response = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("token").asText();
    }

    @Test
    void searchUsers_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/search").param("q", "ali"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void searchUsers_returnsMatchingUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "ali")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void searchUsers_returnsEmptyArrayWhenNoMatch() throws Exception {
        mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "zzznomatch")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getUser_returnsUserByUsername() throws Exception {
        mockMvc.perform(get("/api/v1/users/alice")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void getUser_returns404WhenUserNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/users/nonexistentuser")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUser_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/alice"))
                .andExpect(status().isUnauthorized());
    }
}
