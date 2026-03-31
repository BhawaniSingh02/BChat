package com.substring.chat.services;

import com.substring.chat.dto.request.ChangePasswordRequest;
import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private FileUploadService fileUploadService;

    @InjectMocks
    private UserService userService;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = new User();
        alice.setId("id-alice");
        alice.setUsername("alice");
        alice.setEmail("alice@example.com");
        alice.setPasswordHash("$2a$10$hashed");
        alice.setCreatedAt(LocalDateTime.now());
        alice.setLastSeen(LocalDateTime.now());

        bob = new User();
        bob.setId("id-bob");
        bob.setUsername("bob");
        bob.setEmail("bob@example.com");
        bob.setCreatedAt(LocalDateTime.now());
        bob.setLastSeen(LocalDateTime.now());
    }

    // ── getUserByUsername ────────────────────────────────────────────────────

    @Test
    void getUserByUsername_returnsUserWhenFound() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getUserByUsername("alice");

        assertThat(response.getUsername()).isEqualTo("alice");
        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getId()).isEqualTo("id-alice");
    }

    @Test
    void getUserByUsername_throwsWhenNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByUsername("nobody"))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("nobody");
    }

    // ── getPublicProfile ─────────────────────────────────────────────────────

    @Test
    void getPublicProfile_ownProfileReturnsEverything() {
        alice.setEmail("alice@example.com");
        alice.setLastSeenPrivacy("EVERYONE");
        alice.setOnlinePrivacy("EVERYONE");
        alice.setProfilePhotoPrivacy("EVERYONE");
        alice.setAvatarUrl("https://cdn.example.com/avatar.jpg");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "alice");

        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getAvatarUrl()).isEqualTo("https://cdn.example.com/avatar.jpg");
        assertThat(response.getLastSeenPrivacy()).isEqualTo("EVERYONE");
    }

    @Test
    void getPublicProfile_hidesEmailFromOtherUsers() {
        alice.setEmail("alice@example.com");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getEmail()).isNull();
        assertThat(response.getLastSeenPrivacy()).isNull();
        assertThat(response.getOnlinePrivacy()).isNull();
        assertThat(response.getProfilePhotoPrivacy()).isNull();
    }

    @Test
    void getPublicProfile_hidesAvatarWhenProfilePhotoPrivacyIsNobody() {
        alice.setAvatarUrl("https://cdn.example.com/avatar.jpg");
        alice.setProfilePhotoPrivacy("NOBODY");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getAvatarUrl()).isNull();
    }

    @Test
    void getPublicProfile_showsAvatarWhenProfilePhotoPrivacyIsEveryone() {
        alice.setAvatarUrl("https://cdn.example.com/avatar.jpg");
        alice.setProfilePhotoPrivacy("EVERYONE");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getAvatarUrl()).isEqualTo("https://cdn.example.com/avatar.jpg");
    }

    @Test
    void getPublicProfile_hidesLastSeenWhenPrivacyIsNobody() {
        alice.setLastSeen(LocalDateTime.now());
        alice.setLastSeenPrivacy("NOBODY");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getLastSeen()).isNull();
    }

    @Test
    void getPublicProfile_showsLastSeenWhenPrivacyIsEveryone() {
        LocalDateTime lastSeen = LocalDateTime.now().minusHours(1);
        alice.setLastSeen(lastSeen);
        alice.setLastSeenPrivacy("EVERYONE");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getLastSeen()).isEqualTo(lastSeen);
    }

    @Test
    void getPublicProfile_throwsWhenUserNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getPublicProfile("nobody", "bob"))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void isOnlineVisibleTo_returnsTrueForOwnProfile() {
        assertThat(userService.isOnlineVisibleTo("alice", "alice")).isTrue();
    }

    @Test
    void isOnlineVisibleTo_returnsTrueWhenPrivacyIsEveryone() {
        alice.setOnlinePrivacy("EVERYONE");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        assertThat(userService.isOnlineVisibleTo("alice", "bob")).isTrue();
    }

    @Test
    void isOnlineVisibleTo_returnsFalseWhenPrivacyIsNobody() {
        alice.setOnlinePrivacy("NOBODY");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        assertThat(userService.isOnlineVisibleTo("alice", "bob")).isFalse();
    }

    @Test
    void isOnlineVisibleTo_returnsTrueWhenUserNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThat(userService.isOnlineVisibleTo("ghost", "bob")).isTrue();
    }

    // ── searchUsers ──────────────────────────────────────────────────────────

    @Test
    void searchUsers_returnsMatchingUsers() {
        when(userRepository.findByUsernameContainingIgnoreCase("al")).thenReturn(List.of(alice));

        List<UserResponse> results = userService.searchUsers("al");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("alice");
    }

    @Test
    void searchUsers_returnsEmptyWhenNoMatch() {
        when(userRepository.findByUsernameContainingIgnoreCase("xyz")).thenReturn(List.of());

        List<UserResponse> results = userService.searchUsers("xyz");

        assertThat(results).isEmpty();
    }

    @Test
    void searchUsers_returnsMultipleMatches() {
        when(userRepository.findByUsernameContainingIgnoreCase("b")).thenReturn(List.of(bob));

        List<UserResponse> results = userService.searchUsers("b");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("bob");
    }

    // ── updateProfile ────────────────────────────────────────────────────────

    @Test
    void updateProfile_setsDisplayNameAndBio() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Alice Smith");
        req.setBio("Hello world");

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getDisplayName()).isEqualTo("Alice Smith");
        assertThat(result.getBio()).isEqualTo("Hello world");
        verify(userRepository).save(alice);
    }

    @Test
    void updateProfile_blanksBecomesNull() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("  ");
        req.setBio("  ");

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getDisplayName()).isNull();
        assertThat(result.getBio()).isNull();
    }

    @Test
    void updateProfile_nullFieldsAreIgnored() {
        alice.setDisplayName("Existing Name");
        alice.setBio("Existing bio");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest(); // all null

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getDisplayName()).isEqualTo("Existing Name");
        assertThat(result.getBio()).isEqualTo("Existing bio");
    }

    @Test
    void updateProfile_throwsWhenUserNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        UpdateProfileRequest req = new UpdateProfileRequest();

        assertThatThrownBy(() -> userService.updateProfile("nobody", req))
                .isInstanceOf(UserNotFoundException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateProfile_setsStatusMessage() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setStatusMessage("Hey there! I am using BChat");

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getStatusMessage()).isEqualTo("Hey there! I am using BChat");
    }

    @Test
    void updateProfile_blankStatusMessageBecomesNull() {
        alice.setStatusMessage("Old status");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setStatusMessage("   ");

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getStatusMessage()).isNull();
    }

    @Test
    void updateProfile_setsValidPrivacySettings() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setLastSeenPrivacy("NOBODY");
        req.setOnlinePrivacy("EVERYONE");
        req.setProfilePhotoPrivacy("CONTACTS");

        UserResponse result = userService.updateProfile("alice", req);

        assertThat(result.getLastSeenPrivacy()).isEqualTo("NOBODY");
        assertThat(result.getOnlinePrivacy()).isEqualTo("EVERYONE");
        assertThat(result.getProfilePhotoPrivacy()).isEqualTo("CONTACTS");
    }

    @Test
    void updateProfile_ignoresInvalidPrivacyValues() {
        alice.setLastSeenPrivacy("EVERYONE");
        alice.setOnlinePrivacy("EVERYONE");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setLastSeenPrivacy("INVALID_VALUE");
        req.setOnlinePrivacy("CONTACTS"); // not valid for onlinePrivacy

        UserResponse result = userService.updateProfile("alice", req);

        // invalid values should be ignored, existing values retained
        assertThat(result.getLastSeenPrivacy()).isEqualTo("EVERYONE");
        assertThat(result.getOnlinePrivacy()).isEqualTo("EVERYONE");
    }

    // ── uploadAvatar ─────────────────────────────────────────────────────────

    @Test
    void uploadAvatar_savesAvatarUrl() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(fileUploadService.upload(any())).thenReturn(
                new FileUploadService.UploadResult("https://cdn.example.com/avatar.jpg", "bchat/avatar", "image", 12345L));

        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});
        UserResponse result = userService.uploadAvatar("alice", file);

        assertThat(result.getAvatarUrl()).isEqualTo("https://cdn.example.com/avatar.jpg");
        verify(userRepository).save(alice);
    }

    @Test
    void uploadAvatar_throwsWhenUserNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[]{});

        assertThatThrownBy(() -> userService.uploadAvatar("nobody", file))
                .isInstanceOf(UserNotFoundException.class);
    }

    // ── removeAvatar ─────────────────────────────────────────────────────────

    @Test
    void removeAvatar_clearsAvatarUrl() {
        alice.setAvatarUrl("https://cdn.example.com/old.jpg");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserResponse result = userService.removeAvatar("alice");

        assertThat(result.getAvatarUrl()).isNull();
        verify(userRepository).save(alice);
    }

    @Test
    void removeAvatar_throwsWhenUserNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.removeAvatar("nobody"))
                .isInstanceOf(UserNotFoundException.class);
    }

    // ── changePassword ───────────────────────────────────────────────────────

    @Test
    void changePassword_successWithCorrectCurrentPassword() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches("old-pass", "$2a$10$hashed")).thenReturn(true);
        when(passwordEncoder.encode("new-pass")).thenReturn("$2a$10$newhash");
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("old-pass");
        req.setNewPassword("new-pass");

        userService.changePassword("alice", req);

        assertThat(alice.getPasswordHash()).isEqualTo("$2a$10$newhash");
        verify(userRepository).save(alice);
    }

    @Test
    void changePassword_throwsOnWrongCurrentPassword() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("wrong");
        req.setNewPassword("new-pass");

        assertThatThrownBy(() -> userService.changePassword("alice", req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Current password is incorrect");
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_throwsWhenUserNotFound() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("any");
        req.setNewPassword("newpass");

        assertThatThrownBy(() -> userService.changePassword("nobody", req))
                .isInstanceOf(UserNotFoundException.class);
    }
}
