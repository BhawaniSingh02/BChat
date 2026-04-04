package com.substring.chat.repositories;

import com.substring.chat.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findByRoomIdOrderByTimestampDesc(String roomId, Pageable pageable);

    List<Message> findByRoomIdAndContentContainingIgnoreCaseOrderByTimestampDesc(String roomId, String query);

    // Phase 19 — starred messages: find all messages where the user is in the starred list
    List<Message> findByStarredContaining(String username);

    // Phase 21 — disappearing messages: find expired messages for deletion
    List<Message> findByDisappearsAtBeforeAndDeletedFalse(Instant now);

    // Phase 25 — global search: find messages by content across multiple rooms
    List<Message> findByRoomIdInAndContentContainingIgnoreCaseAndDeletedFalseOrderByTimestampDesc(
            List<String> roomIds, String query, Pageable pageable);

    // Phase 27 — threads: find all replies for a given parent message
    List<Message> findByThreadIdOrderByTimestampAsc(String threadId);

    // Phase 27 — cursor pagination: messages before a given timestamp
    Page<Message> findByRoomIdAndTimestampBeforeOrderByTimestampDesc(String roomId, Instant before, Pageable pageable);
}
