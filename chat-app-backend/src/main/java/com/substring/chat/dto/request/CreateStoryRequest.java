package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateStoryRequest {
    private String type;             // TEXT | IMAGE (defaults to TEXT)
    private String content;          // text body or image caption
    private String mediaUrl;         // required for IMAGE
    private String backgroundColor;  // optional, for TEXT stories
}
