package com.substring.chat.dto.response;

import com.substring.chat.entities.ContactRequest;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ContactRequestResponse {

    private String id;
    private String fromUserId;
    private String toUserId;
    private String fromHandle;
    private String fromDisplayName;
    private String fromAvatarUrl;
    private String status;
    private Instant createdAt;

    public static ContactRequestResponse from(ContactRequest req, UserResponse fromUser) {
        ContactRequestResponse r = new ContactRequestResponse();
        r.setId(req.getId());
        r.setFromUserId(req.getFromUserId());
        r.setToUserId(req.getToUserId());
        r.setStatus(req.getStatus());
        r.setCreatedAt(req.getCreatedAt());
        if (fromUser != null) {
            r.setFromHandle(fromUser.getUniqueHandle());
            r.setFromDisplayName(fromUser.getDisplayName());
            r.setFromAvatarUrl(fromUser.getAvatarUrl());
        }
        return r;
    }
}
