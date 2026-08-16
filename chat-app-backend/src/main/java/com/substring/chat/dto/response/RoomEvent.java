package com.substring.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Pushed to each affected member's personal queue ({@code /user/queue/room-events}) whenever
 * a room's membership or details change — kick, leave, join, or a name/description edit.
 * Delivered per-user (not via {@code /topic/room/{roomId}}) so it reaches members regardless
 * of whether they currently have that conversation screen open.
 */
@Getter
@Setter
@AllArgsConstructor
public class RoomEvent {

    public enum Type {
        UPDATED, MEMBER_REMOVED, MEMBER_LEFT, MEMBER_JOINED
    }

    private Type eventType;
    private String roomId;
    /** Null when the recipient is the member who was just removed (they can no longer see room details). */
    private RoomResponse room;
    /** Username the event is about — who was kicked, who left, or who joined. */
    private String affectedUsername;
}
