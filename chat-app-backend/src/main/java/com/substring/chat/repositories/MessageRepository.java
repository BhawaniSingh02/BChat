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
}
