package com.substring.chat.repositories;

import com.substring.chat.entities.Story;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface StoryRepository extends MongoRepository<Story, String> {

    /** Active (non-expired) stories from any of the given authors, oldest first. */
    List<Story> findByAuthorIdInAndExpiresAtAfterOrderByCreatedAtAsc(Collection<String> authorIds, Instant now);

    /** Active stories for a single author, oldest first. */
    List<Story> findByAuthorIdAndExpiresAtAfterOrderByCreatedAtAsc(String authorId, Instant now);
}
