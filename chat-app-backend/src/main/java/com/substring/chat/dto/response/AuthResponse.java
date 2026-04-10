package com.substring.chat.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String token;
    private String username;   // = uniqueHandle for verified users
    private String email;
    private String userId;
    private String uniqueHandle;
    private String whoCanMessage;
}
