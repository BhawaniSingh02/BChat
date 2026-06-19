package com.substring.chat.repositories;

import com.substring.chat.entities.PushSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends MongoRepository<PushSubscription, String> {

    List<PushSubscription> findByUsername(String username);

    Optional<PushSubscription> findByEndpoint(String endpoint);

    void deleteByEndpoint(String endpoint);
}
