package com.substring.chat.dto.response;

import com.substring.chat.entities.Story;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

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

    public static StoryResponse from(Story story, String requestingUser) {
        boolean viewed = story.getViewedBy() != null && story.getViewedBy().contains(requestingUser);
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
                .build();
    }
}
