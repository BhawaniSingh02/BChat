package com.substring.chat.repositories;

import com.substring.chat.entities.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CallSessionRepository extends MongoRepository<CallSession, String> {

    /** All call sessions for a conversation, newest first. */
    List<CallSession> findByConversationIdOrderByStartedAtDesc(String conversationId);

    /** Find a ringing or active call in a conversation (at most one should exist). */
    Optional<CallSession> findByConversationIdAndStatusIn(String conversationId,
                                                          List<CallSession.CallStatus> statuses);
}
