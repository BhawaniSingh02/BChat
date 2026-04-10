package com.substring.chat.services;

import com.substring.chat.repositories.PasswordResetTokenRepository;
import com.substring.chat.repositories.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    /** Runs every hour — removes expired/revoked tokens. */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanup() {
        Instant now = Instant.now();
        refreshTokenRepository.deleteAllByExpiresAtBefore(now);
        passwordResetTokenRepository.deleteAllByUsedTrueOrExpiresAtBefore(true, now);
        log.debug("Token cleanup complete");
    }
}
