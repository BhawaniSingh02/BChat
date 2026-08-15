package com.substring.chat.repositories;

import com.substring.chat.entities.MobilePushToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MobilePushTokenRepository extends MongoRepository<MobilePushToken, String> {

    List<MobilePushToken> findByUsername(String username);

    Optional<MobilePushToken> findByExpoPushToken(String expoPushToken);

    void deleteByExpoPushToken(String expoPushToken);
}
