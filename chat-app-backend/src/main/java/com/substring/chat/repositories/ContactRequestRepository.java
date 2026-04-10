package com.substring.chat.repositories;

import com.substring.chat.entities.ContactRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ContactRequestRepository extends MongoRepository<ContactRequest, String> {

    Optional<ContactRequest> findByFromUserIdAndToUserId(String fromUserId, String toUserId);

    List<ContactRequest> findByToUserIdAndStatus(String toUserId, String status);

    List<ContactRequest> findByFromUserIdAndStatus(String fromUserId, String status);

    boolean existsByFromUserIdAndToUserIdAndStatusIn(String fromUserId, String toUserId, List<String> statuses);
}
