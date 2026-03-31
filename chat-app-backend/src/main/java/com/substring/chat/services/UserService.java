package com.substring.chat.services;

import com.substring.chat.dto.request.ChangePasswordRequest;
import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> VALID_PRIVACY_EVERYONE_NOBODY =
            Set.of("EVERYONE", "NOBODY");
    private static final Set<String> VALID_PRIVACY_WITH_CONTACTS =
            Set.of("EVERYONE", "NOBODY", "CONTACTS");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileUploadService fileUploadService;

    /** Full profile — only for the authenticated user themselves (via /me). */
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
        return UserResponse.from(user);
    }

    /**
     * Privacy-filtered public profile for viewing another user's profile.
     * Hides email, privacy settings, and fields controlled by privacy from non-self viewers.
     */
    public UserResponse getPublicProfile(String targetUsername, String viewerUsername) {
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new UserNotFoundException(targetUsername));

        // Own profile — return everything (same as /me)
        if (targetUsername.equals(viewerUsername)) {
            return UserResponse.from(target);
        }

        UserResponse response = UserResponse.from(target);

        // Hide email — never expose to other users
        response.setEmail(null);
        // Hide privacy settings — viewer doesn't need to know target's settings
        response.setLastSeenPrivacy(null);
        response.setOnlinePrivacy(null);
        response.setProfilePhotoPrivacy(null);

        // Profile photo privacy
        if ("NOBODY".equals(target.getProfilePhotoPrivacy())) {
            response.setAvatarUrl(null);
        }

        // Last seen privacy
        if ("NOBODY".equals(target.getLastSeenPrivacy())) {
            response.setLastSeen(null);
        }

        return response;
    }

    /**
     * Returns whether a user's online status is visible to a given viewer.
     * Respects the user's onlinePrivacy setting.
     */
    public boolean isOnlineVisibleTo(String targetUsername, String viewerUsername) {
        if (targetUsername.equals(viewerUsername)) return true;
        return userRepository.findByUsername(targetUsername)
                .map(u -> !"NOBODY".equals(u.getOnlinePrivacy()))
                .orElse(true);
    }

    public List<UserResponse> searchUsers(String query) {
        return userRepository.findByUsernameContainingIgnoreCase(query)
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    public UserResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName().isBlank() ? null : request.getDisplayName().trim());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio().isBlank() ? null : request.getBio().trim());
        }
        if (request.getStatusMessage() != null) {
            user.setStatusMessage(request.getStatusMessage().isBlank() ? null : request.getStatusMessage().trim());
        }
        if (request.getLastSeenPrivacy() != null
                && VALID_PRIVACY_WITH_CONTACTS.contains(request.getLastSeenPrivacy())) {
            user.setLastSeenPrivacy(request.getLastSeenPrivacy());
        }
        if (request.getOnlinePrivacy() != null
                && VALID_PRIVACY_EVERYONE_NOBODY.contains(request.getOnlinePrivacy())) {
            user.setOnlinePrivacy(request.getOnlinePrivacy());
        }
        if (request.getProfilePhotoPrivacy() != null
                && VALID_PRIVACY_WITH_CONTACTS.contains(request.getProfilePhotoPrivacy())) {
            user.setProfilePhotoPrivacy(request.getProfilePhotoPrivacy());
        }

        userRepository.save(user);
        return UserResponse.from(user);
    }

    public UserResponse uploadAvatar(String username, MultipartFile file) throws Exception {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        FileUploadService.UploadResult result = fileUploadService.upload(file);
        user.setAvatarUrl(result.url());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    public UserResponse removeAvatar(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
        user.setAvatarUrl(null);
        userRepository.save(user);
        return UserResponse.from(user);
    }

    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
