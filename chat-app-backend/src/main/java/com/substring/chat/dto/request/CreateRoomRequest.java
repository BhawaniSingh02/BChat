package com.substring.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoomRequest {

    @NotBlank(message = "Room ID is required")
    @Size(min = 3, max = 50, message = "Room ID must be between 3 and 50 characters")
    private String roomId;

    @NotBlank(message = "Room name is required")
    @Size(min = 1, max = 100, message = "Room name must be between 1 and 100 characters")
    private String name;

    private String description;
}
