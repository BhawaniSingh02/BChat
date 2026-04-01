package com.substring.chat.controllers;

import com.substring.chat.dto.request.ChangePasswordRequest;
import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private Principal principal;
    private UserResponse userResponse;

    @BeforeEach
    void setUp() {
        principal = () -> "alice";

        userResponse = new UserResponse();
        userResponse.setId("id-alice");
        userResponse.setUsername("alice");
        userResponse.setEmail("alice@example.com");
        userResponse.setDisplayName("Alice Smith");
        userResponse.setBio("Hello");
        userResponse.setStatusMessage("Hey there!");
        userResponse.setLastSeenPrivacy("EVERYONE");
        userResponse.setOnlinePrivacy("EVERYONE");
        userResponse.setProfilePhotoPrivacy("EVERYONE");
        userResponse.setCreatedAt(Instant.now());
    }

    @Test
    void getMe_returnsCurrentUserProfile() {
        when(userService.getUserByUsername("alice")).thenReturn(userResponse);

        ResponseEntity<UserResponse> response = userController.getMe(principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("alice");
        assertThat(response.getBody().getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void updateMe_updatesProfileFields() {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Alice Updated");
        req.setStatusMessage("Available");

        UserResponse updated = new UserResponse();
        updated.setUsername("alice");
        updated.setDisplayName("Alice Updated");
        updated.setStatusMessage("Available");

        when(userService.updateProfile("alice", req)).thenReturn(updated);

        ResponseEntity<UserResponse> response = userController.updateMe(req, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDisplayName()).isEqualTo("Alice Updated");
        assertThat(response.getBody().getStatusMessage()).isEqualTo("Available");
    }

    @Test
    void uploadAvatar_returnsUpdatedProfile() throws Exception {
        UserResponse withAvatar = new UserResponse();
        withAvatar.setUsername("alice");
        withAvatar.setAvatarUrl("https://cdn.example.com/avatar.jpg");

        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});
        when(userService.uploadAvatar("alice", file)).thenReturn(withAvatar);

        ResponseEntity<UserResponse> response = userController.uploadAvatar(file, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAvatarUrl()).isEqualTo("https://cdn.example.com/avatar.jpg");
    }

    @Test
    void removeAvatar_clearsAvatarUrl() {
        UserResponse noAvatar = new UserResponse();
        noAvatar.setUsername("alice");
        noAvatar.setAvatarUrl(null);

        when(userService.removeAvatar("alice")).thenReturn(noAvatar);

        ResponseEntity<UserResponse> response = userController.removeAvatar(principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAvatarUrl()).isNull();
    }

    @Test
    void changePassword_returnsSuccessMessage() {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("old");
        req.setNewPassword("newpass123");

        doNothing().when(userService).changePassword("alice", req);

        ResponseEntity<Map<String, String>> response = userController.changePassword(req, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).isEqualTo("Password changed successfully");
        verify(userService).changePassword("alice", req);
    }

    @Test
    void searchUsers_returnsMatchingList() {
        List<UserResponse> results = List.of(userResponse);
        when(userService.searchUsers("ali")).thenReturn(results);

        ResponseEntity<List<UserResponse>> response = userController.searchUsers("ali");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getUsername()).isEqualTo("alice");
    }

    @Test
    void getUser_returnsPublicProfileWithPrivacyFiltering() {
        UserResponse publicProfile = new UserResponse();
        publicProfile.setUsername("alice");
        publicProfile.setEmail(null); // email hidden from others
        when(userService.getPublicProfile("alice", "alice")).thenReturn(publicProfile);

        ResponseEntity<UserResponse> response = userController.getUser("alice", principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("alice");
        verify(userService).getPublicProfile("alice", "alice");
    }

    @Test
    void legacyUpdateProfile_stillWorks() {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Legacy Update");

        when(userService.updateProfile("alice", req)).thenReturn(userResponse);

        ResponseEntity<UserResponse> response = userController.updateProfile(req, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(userService).updateProfile("alice", req);
    }
}
