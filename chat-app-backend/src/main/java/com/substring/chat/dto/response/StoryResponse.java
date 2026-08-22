package com.substring.chat.dto.response;

import com.substring.chat.entities.Story;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Builder
public class StoryResponse {

    private String id;
    private String authorId;
    private String type;
    private String content;
    private String mediaUrl;
    private String backgroundColor;
    private Instant createdAt;
    private Instant expiresAt;
    private boolean viewedByMe;
    private int viewerCount;
    private Map<String, Integer> reactions; // emoji -> count
    private String myReaction;              // requester's current emoji, if any

    public static StoryResponse from(Story story, String requestingUser) {
        boolean viewed = story.getViewedBy() != null && story.getViewedBy().contains(requestingUser);
        Map<String, List<String>> reactions = story.getReactions();
        Map<String, Integer> reactionCounts = reactions == null ? Map.of()
                : reactions.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().size()));
        String myReaction = reactions == null ? null
                : reactions.entrySet().stream()
                    .filter(e -> e.getValue().contains(requestingUser))
                    .map(Map.Entry::getKey)
                    .findFirst().orElse(null);
        return StoryResponse.builder()
                .id(story.getId())
                .authorId(story.getAuthorId())
                .type(story.getType() != null ? story.getType().name() : "TEXT")
                .content(story.getContent())
                .mediaUrl(story.getMediaUrl())
                .backgroundColor(story.getBackgroundColor())
                .createdAt(story.getCreatedAt())
                .expiresAt(story.getExpiresAt())
                .viewedByMe(viewed)
                .viewerCount(story.getViewedBy() != null ? story.getViewedBy().size() : 0)
                .reactions(reactionCounts)
                .myReaction(myReaction)
                .build();
    }
}
