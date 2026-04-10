package com.substring.chat.services;

import com.substring.chat.entities.RefreshToken;
import com.substring.chat.repositories.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${refresh.expiry-days:30}")
    private int refreshExpiryDays;

    public RefreshToken create(String username, String ip, String deviceInfo) {
        // Revoke all existing tokens for this user (single-session per user policy)
        // Comment this out if you want multi-device support
        // refreshTokenRepository.deleteAllByUsername(username);

        RefreshToken token = new RefreshToken();
        token.setToken(generateSecureToken());
        token.setUsername(username);
        token.setExpiresAt(Instant.now().plusSeconds(refreshExpiryDays * 86_400L));
        token.setCreatedAt(Instant.now());
        token.setIpAddress(ip);
        token.setDeviceInfo(deviceInfo != null && deviceInfo.length() > 200
                ? deviceInfo.substring(0, 200) : deviceInfo);
        return refreshTokenRepository.save(token);
    }

    public Optional<RefreshToken> validate(String tokenValue) {
        return refreshTokenRepository.findByToken(tokenValue)
                .filter(t -> !t.isRevoked() && Instant.now().isBefore(t.getExpiresAt()));
    }

    public void revoke(String tokenValue) {
        refreshTokenRepository.findByToken(tokenValue).ifPresent(t -> {
            t.setRevoked(true);
            refreshTokenRepository.save(t);
        });
    }

    public void revokeAllForUser(String username) {
        refreshTokenRepository.findAllByUsername(username).forEach(t -> {
            t.setRevoked(true);
            refreshTokenRepository.save(t);
        });
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
