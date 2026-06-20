package com.substring.chat.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

/** A single author's active stories, grouped for the stories bar. */
@Getter
@Builder
public class StoryGroupResponse {

    private String authorId;
    private List<StoryResponse> stories;
    private boolean hasUnviewed;     // any story not yet seen by the requester
    private Instant lastStoryAt;     // newest story timestamp (for sorting)
}
