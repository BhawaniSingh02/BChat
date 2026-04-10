package com.substring.chat.repositories;

import com.substring.chat.entities.RefreshToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    List<RefreshToken> findAllByUsername(String username);
    void deleteAllByUsername(String username);
    void deleteAllByExpiresAtBefore(Instant cutoff);
    void deleteAllByRevokedTrueAndExpiresAtBefore(Instant cutoff);
}
