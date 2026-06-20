package com.substring.chat.controllers;

import com.substring.chat.dto.request.CreateStoryRequest;
import com.substring.chat.dto.request.StoryReplyRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.StoryGroupResponse;
import com.substring.chat.dto.response.StoryResponse;
import com.substring.chat.services.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    /** Post a new 24-hour story. */
    @PostMapping
    public ResponseEntity<StoryResponse> create(
            @RequestBody CreateStoryRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storyService.createStory(user.getUsername(), request));
    }

    /** The stories feed grouped by author (self + DM contacts). */
    @GetMapping("/feed")
    public ResponseEntity<List<StoryGroupResponse>> feed(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(storyService.getFeed(user.getUsername()));
    }

    /** Mark a story as viewed. */
    @PostMapping("/{storyId}/view")
    public ResponseEntity<Void> view(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetails user) {
        storyService.markViewed(storyId, user.getUsername());
        return ResponseEntity.noContent().build();
    }

    /** Reply to a story — sends a DM to the author quoting it. */
    @PostMapping("/{storyId}/reply")
    public ResponseEntity<MessageResponse> reply(
            @PathVariable String storyId,
            @RequestBody StoryReplyRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storyService.replyToStory(storyId, user.getUsername(), request.getText()));
    }

    /** Who viewed a story (author only). */
    @GetMapping("/{storyId}/viewers")
    public ResponseEntity<Map<String, List<String>>> viewers(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(Map.of("viewers", storyService.getViewers(storyId, user.getUsername())));
    }

    /** Delete an own story. */
    @DeleteMapping("/{storyId}")
    public ResponseEntity<Void> delete(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetails user) {
        storyService.deleteStory(storyId, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
