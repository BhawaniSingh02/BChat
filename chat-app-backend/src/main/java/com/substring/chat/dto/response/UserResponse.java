package com.substring.chat.dto.response;

import com.substring.chat.entities.User;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UserResponse {

    private String id;
    private String username;
    private String email;
    private String avatarUrl;
    private String displayName;
    private String bio;
    private LocalDateTime createdAt;
    private LocalDateTime lastSeen;

    public static UserResponse from(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setDisplayName(user.getDisplayName());
        response.setBio(user.getBio());
        response.setCreatedAt(user.getCreatedAt());
        response.setLastSeen(user.getLastSeen());
        return response;
    }
}
