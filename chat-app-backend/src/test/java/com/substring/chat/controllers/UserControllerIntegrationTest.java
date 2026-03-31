package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.ChangePasswordRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
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

    // ── Search ─────────────────────────────────────────────────────────────────

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

    // ── Get user ───────────────────────────────────────────────────────────────

    @Test
    void getUser_returnsPublicProfileWithoutEmail() throws Exception {
        // Email must be hidden from other users — only /me returns email
        mockMvc.perform(get("/api/v1/users/alice")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void getUser_ownProfileShowsEmail() throws Exception {
        // Viewing your own profile via /{username} returns email (same as /me)
        mockMvc.perform(get("/api/v1/users/searchuser")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("searchuser"))
                .andExpect(jsonPath("$.email").value("search@example.com"));
    }

    @Test
    void getUser_profilePhotoHiddenWhenPrivacyNobody() throws Exception {
        // alice2 sets profilePhotoPrivacy=NOBODY, their avatar hidden from searchuser
        String alice2Token = registerAndGetToken("alice2", "alice2@example.com", "password123");
        UpdateProfileRequest privReq = new UpdateProfileRequest();
        privReq.setProfilePhotoPrivacy("NOBODY");
        mockMvc.perform(patch("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(privReq))
                        .header("Authorization", "Bearer " + alice2Token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/users/alice2")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice2"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
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

    // ── GET /me ────────────────────────────────────────────────────────────────

    @Test
    void getMe_returnsOwnProfile() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("searchuser"))
                .andExpect(jsonPath("$.email").value("search@example.com"));
    }

    @Test
    void getMe_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }

    // ── PATCH /me ──────────────────────────────────────────────────────────────

    @Test
    void updateMe_updatesDisplayNameAndBio() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Search User");
        req.setBio("Integration tester");
        req.setStatusMessage("Testing all the things");

        mockMvc.perform(patch("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Search User"))
                .andExpect(jsonPath("$.bio").value("Integration tester"))
                .andExpect(jsonPath("$.statusMessage").value("Testing all the things"));
    }

    @Test
    void updateMe_updatesPrivacySettings() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setLastSeenPrivacy("NOBODY");
        req.setOnlinePrivacy("NOBODY");
        req.setProfilePhotoPrivacy("CONTACTS");

        mockMvc.perform(patch("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastSeenPrivacy").value("NOBODY"))
                .andExpect(jsonPath("$.onlinePrivacy").value("NOBODY"))
                .andExpect(jsonPath("$.profilePhotoPrivacy").value("CONTACTS"));
    }

    @Test
    void updateMe_returns401WithoutToken() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Hacker");

        mockMvc.perform(patch("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── DELETE /me/avatar ──────────────────────────────────────────────────────

    @Test
    void removeAvatar_returns200EvenWithNoAvatar() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me/avatar")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("searchuser"));
    }

    @Test
    void removeAvatar_returns401WithoutToken() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me/avatar"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /me/password ───────────────────────────────────────────────────────

    @Test
    void changePassword_succeedsWithCorrectCurrentPassword() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("password123");
        req.setNewPassword("newpassword456");

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password changed successfully"));
    }

    @Test
    void changePassword_returns400WithWrongCurrentPassword() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("wrongpassword");
        req.setNewPassword("newpassword456");

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_returns401WithoutToken() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("password123");
        req.setNewPassword("newpassword456");

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── Legacy endpoint ────────────────────────────────────────────────────────

    @Test
    void legacyPatchProfile_stillReturns200() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Legacy Display");

        mockMvc.perform(patch("/api/v1/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Legacy Display"));
    }
}
