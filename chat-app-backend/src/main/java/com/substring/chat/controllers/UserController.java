package com.substring.chat.controllers;

import com.substring.chat.dto.request.ChangePasswordRequest;
import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Get own full profile (includes privacy settings + email) */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(Principal principal) {
        return ResponseEntity.ok(userService.getUserByUsername(principal.getName()));
    }

    /** Update profile fields: displayName, bio, statusMessage, privacy settings */
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @RequestBody UpdateProfileRequest request,
            Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request));
    }

    /** Upload new profile photo */
    @PostMapping("/me/avatar")
    public ResponseEntity<UserResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Principal principal) throws Exception {
        return ResponseEntity.ok(userService.uploadAvatar(principal.getName(), file));
    }

    /** Remove profile photo (reset to initials avatar) */
    @DeleteMapping("/me/avatar")
    public ResponseEntity<UserResponse> removeAvatar(Principal principal) {
        return ResponseEntity.ok(userService.removeAvatar(principal.getName()));
    }

    /** Change password — requires currentPassword verification */
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    /** Search users by username prefix */
    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(@RequestParam String q) {
        return ResponseEntity.ok(userService.searchUsers(q));
    }

    /** Get public profile of any user — privacy settings are enforced */
    @GetMapping("/{username}")
    public ResponseEntity<UserResponse> getUser(@PathVariable String username, Principal principal) {
        return ResponseEntity.ok(userService.getPublicProfile(username, principal.getName()));
    }

    /** Legacy endpoint — kept for backward compatibility */
    @PatchMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request));
    }
}
