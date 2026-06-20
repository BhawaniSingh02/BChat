package com.substring.chat.repositories;

import com.substring.chat.entities.CallSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CallSessionRepository extends MongoRepository<CallSession, String> {

    /** All call sessions for a conversation, newest first. */
    List<CallSession> findByConversationIdOrderByStartedAtDesc(String conversationId);

    /** All call sessions involving a user (as caller or callee), newest first (paged). */
    @Query(value = "{ '$or': [{ 'callerId': ?0 }, { 'calleeId': ?0 }] }", sort = "{ 'startedAt': -1 }")
    List<CallSession> findByParticipant(String username, Pageable pageable);

    /** Find a ringing or active call in a conversation (at most one should exist). */
    Optional<CallSession> findByConversationIdAndStatusIn(String conversationId,
                                                          List<CallSession.CallStatus> statuses);

    /**
     * Find any active or ringing call that involves a given user (as caller or callee).
     * Used for cross-conversation busy detection.
     */
    @Query("{ '$or': [{ 'callerId': ?0 }, { 'calleeId': ?0 }], 'status': { '$in': ?1 } }")
    Optional<CallSession> findActiveCallByParticipant(String username, List<CallSession.CallStatus> statuses);

    @Query("{ '$or': [{ 'callerId': ?0 }, { 'calleeId': ?0 }], 'status': { '$in': ?1 } }")
    List<CallSession> findAllActiveCallsByParticipant(String username, List<CallSession.CallStatus> statuses);

    /** Find all sessions with the given status that started before the given time (for janitor cleanup). */
    List<CallSession> findByStatusAndStartedAtBefore(CallSession.CallStatus status, Instant before);

    /** Find all sessions in any of the given statuses that started before the given time. */
    List<CallSession> findByStatusInAndStartedAtBefore(List<CallSession.CallStatus> statuses, Instant before);
}
