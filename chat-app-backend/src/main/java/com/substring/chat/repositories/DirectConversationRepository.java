package com.substring.chat.repositories;

import com.substring.chat.entities.DirectConversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DirectConversationRepository extends MongoRepository<DirectConversation, String> {

    @Query("{ 'participants': { $all: [?0, ?1] }, $expr: { $eq: [{ $size: '$participants' }, 2] } }")
    Optional<DirectConversation> findByBothParticipants(String user1, String user2);

    List<DirectConversation> findByParticipantsContaining(String username);
}
