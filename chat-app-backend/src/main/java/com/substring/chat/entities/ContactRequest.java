package com.substring.chat.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "contactRequests")
@CompoundIndex(name = "from_to_idx", def = "{'fromUserId': 1, 'toUserId': 1}")
@Getter
@Setter
@NoArgsConstructor
public class ContactRequest {

    @Id
    private String id;

    private String fromUserId;
    private String toUserId;

    /** PENDING | ACCEPTED | REJECTED */
    private String status = "PENDING";

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
