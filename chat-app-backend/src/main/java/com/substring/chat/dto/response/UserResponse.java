package com.substring.chat.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.substring.chat.entities.User;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {

    private String id;
    private String username;
    private String email;
    private String avatarUrl;
    private String displayName;
    private String bio;
    private String statusMessage;
    private String lastSeenPrivacy;
    private String onlinePrivacy;
    private String profilePhotoPrivacy;
    private Instant createdAt;
    private Instant lastSeen;

    public static UserResponse from(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setDisplayName(user.getDisplayName());
        response.setBio(user.getBio());
        response.setStatusMessage(user.getStatusMessage());
        response.setLastSeenPrivacy(user.getLastSeenPrivacy());
        response.setOnlinePrivacy(user.getOnlinePrivacy());
        response.setProfilePhotoPrivacy(user.getProfilePhotoPrivacy());
        response.setCreatedAt(user.getCreatedAt());
        response.setLastSeen(user.getLastSeen());
        return response;
    }
}
