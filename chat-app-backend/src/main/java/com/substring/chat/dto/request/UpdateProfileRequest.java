package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {
    private String displayName;
    private String bio;
    private String statusMessage;
    private String lastSeenPrivacy;
    private String onlinePrivacy;
    private String profilePhotoPrivacy;
}
