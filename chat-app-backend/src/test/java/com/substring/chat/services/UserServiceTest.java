package com.substring.chat.services;

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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

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
        alice.setCreatedAt(LocalDateTime.now());
        alice.setLastSeen(LocalDateTime.now());

        bob = new User();
        bob.setId("id-bob");
        bob.setUsername("bob");
        bob.setEmail("bob@example.com");
        bob.setCreatedAt(LocalDateTime.now());
        bob.setLastSeen(LocalDateTime.now());
    }

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

        UpdateProfileRequest req = new UpdateProfileRequest(); // both null

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
}
