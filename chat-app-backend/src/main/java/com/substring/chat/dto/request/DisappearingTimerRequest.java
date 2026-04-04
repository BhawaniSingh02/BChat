package com.substring.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DisappearingTimerRequest {

    /** OFF | 24H | 7D | 90D */
    @NotBlank(message = "Timer value is required")
    private String timer;
}
