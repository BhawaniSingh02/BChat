package com.substring.chat.services;

import com.substring.chat.dto.request.UpdateProfileRequest;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
        return UserResponse.from(user);
    }

    public List<UserResponse> searchUsers(String query) {
        // search by username prefix (case-insensitive)
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
        userRepository.save(user);
        return UserResponse.from(user);
    }
}
