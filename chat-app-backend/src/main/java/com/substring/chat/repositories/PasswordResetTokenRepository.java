package com.substring.chat.repositories;

import com.substring.chat.entities.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findByToken(String token);
    void deleteAllByUsedTrueOrExpiresAtBefore(boolean used, Instant cutoff);
}
