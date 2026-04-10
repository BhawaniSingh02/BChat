package com.substring.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendContactRequestRequest {

    @NotBlank(message = "Target handle is required")
    private String toHandle;
}
