package com.substring.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class TypingEvent {

    private String roomId;
    private String username;
    private boolean typing;
}
