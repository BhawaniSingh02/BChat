package com.substring.chat.services;

import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.response.AuthResponse;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserAlreadyExistsException;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setLastSeen(LocalDateTime.now());

        User saved = userRepository.save(user);
        String token = jwtTokenProvider.generateToken(saved.getUsername());

        return new AuthResponse(token, saved.getUsername(), saved.getEmail(), saved.getId());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getEmail(), user.getId());
    }
}
