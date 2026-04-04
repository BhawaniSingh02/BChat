package com.substring.chat.services;

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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceBlockingTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private FileUploadService fileUploadService;

    @InjectMocks private UserService userService;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = new User();
        alice.setId("alice-id");
        alice.setUsername("alice");
        alice.setEmail("alice@example.com");
        alice.setPasswordHash("hashed");
        alice.setBlockedUsers(new ArrayList<>());
        alice.setCreatedAt(Instant.now());

        bob = new User();
        bob.setId("bob-id");
        bob.setUsername("bob");
        bob.setEmail("bob@example.com");
        bob.setPasswordHash("hashed");
        bob.setBlockedUsers(new ArrayList<>());
        bob.setCreatedAt(Instant.now());
    }

    @Test
    void blockUser_addsTargetToBlockedList() {
        when(userRepository.existsByUsername("bob")).thenReturn(true);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenReturn(alice);

        UserResponse response = userService.blockUser("alice", "bob");

        assertThat(response.getBlockedUsers()).contains("bob");
    }

    @Test
    void blockUser_idempotent_doesNotDuplicateBlock() {
        alice.getBlockedUsers().add("bob");
        when(userRepository.existsByUsername("bob")).thenReturn(true);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        // save() not called when user already blocked — no stub needed

        userService.blockUser("alice", "bob");

        long count = alice.getBlockedUsers().stream().filter("bob"::equals).count();
        assertThat(count).isEqualTo(1);
    }

    @Test
    void blockUser_throwsWhenBlockingYourself() {
        assertThatThrownBy(() -> userService.blockUser("alice", "alice"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot block yourself");
    }

    @Test
    void blockUser_throwsWhenTargetNotFound() {
        when(userRepository.existsByUsername("ghost")).thenReturn(false);

        assertThatThrownBy(() -> userService.blockUser("alice", "ghost"))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void unblockUser_removesFromBlockedList() {
        alice.getBlockedUsers().add("bob");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenReturn(alice);

        UserResponse response = userService.unblockUser("alice", "bob");

        assertThat(response.getBlockedUsers()).doesNotContain("bob");
    }

    @Test
    void unblockUser_gracefullyHandlesUnblockingNonBlockedUser() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenReturn(alice);

        // should not throw
        UserResponse response = userService.unblockUser("alice", "charlie");
        assertThat(response.getBlockedUsers()).doesNotContain("charlie");
    }

    @Test
    void getBlockedUsers_returnsBlockedUserProfiles() {
        alice.getBlockedUsers().add("bob");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        List<UserResponse> blocked = userService.getBlockedUsers("alice");

        assertThat(blocked).hasSize(1);
        assertThat(blocked.get(0).getUsername()).isEqualTo("bob");
    }

    @Test
    void getBlockedUsers_returnsEmptyListWhenNoneBlocked() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        List<UserResponse> blocked = userService.getBlockedUsers("alice");

        assertThat(blocked).isEmpty();
    }

    @Test
    void isBlockedBy_returnsTrueWhenViewerIsBlocked() {
        bob.getBlockedUsers().add("alice"); // bob blocked alice
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        // alice is trying to view bob, bob has blocked alice
        boolean result = userService.isBlockedBy("bob", "alice");

        assertThat(result).isTrue();
    }

    @Test
    void isBlockedBy_returnsFalseWhenNotBlocked() {
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        boolean result = userService.isBlockedBy("bob", "alice");

        assertThat(result).isFalse();
    }

    @Test
    void getPublicProfile_hidesBlockedUsersFromOtherUsers() {
        alice.getBlockedUsers().add("charlie");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getPublicProfile("alice", "bob");

        assertThat(response.getBlockedUsers()).isNull(); // hidden from other users
    }

    @Test
    void getUserByUsername_includesBlockedUsersForSelf() {
        alice.getBlockedUsers().add("charlie");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        UserResponse response = userService.getUserByUsername("alice");

        assertThat(response.getBlockedUsers()).contains("charlie");
    }
}
