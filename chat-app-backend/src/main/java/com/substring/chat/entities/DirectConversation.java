package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "direct_conversations")
@CompoundIndex(name = "participants_idx", def = "{'participants': 1}", unique = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DirectConversation {

    @Id
    private String id;

    private List<String> participants; // exactly two usernames

    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
}
