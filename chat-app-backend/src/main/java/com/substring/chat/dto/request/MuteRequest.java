package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MuteRequest {

    /**
     * Duration to mute:
     * "8H" = 8 hours, "1W" = 1 week, "ALWAYS" = indefinitely
     * null or "ALWAYS" → muted until explicitly unmuted
     */
    private String duration = "ALWAYS";
}
