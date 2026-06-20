package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * An ephemeral 24-hour status ("story"). A TTL index on {@code expiresAt} lets
 * MongoDB auto-delete expired stories. Audience is the author's DM graph
 * (people they share an accepted conversation with).
 */
@Document(collection = "stories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Story {

    @Id
    private String id;

    @Indexed
    private String authorId;            // opaque username of the poster

    private StoryType type;             // TEXT | IMAGE
    private String content;             // text body (TEXT) or caption (IMAGE), may be blank
    private String mediaUrl;            // Cloudinary URL for IMAGE stories
    private String backgroundColor;     // hex/gradient key for TEXT stories

    private Instant createdAt;

    /** TTL: MongoDB removes the document once this timestamp passes. */
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    private List<String> viewedBy = new ArrayList<>();  // usernames who have seen it

    public enum StoryType {
        TEXT, IMAGE
    }
}
