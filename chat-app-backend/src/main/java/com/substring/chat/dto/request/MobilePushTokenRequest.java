package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

/** Registers (or unregisters) an Expo push token for the current user's device. */
@Getter
@Setter
public class MobilePushTokenRequest {
    private String expoPushToken;
    private String platform;
}
