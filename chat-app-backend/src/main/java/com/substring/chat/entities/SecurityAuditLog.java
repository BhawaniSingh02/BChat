package com.substring.chat.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "security_audit_log")
@Getter @Setter @NoArgsConstructor
public class SecurityAuditLog {
    @Id private String id;
    private String eventType;
    @Indexed private String username;
    private String ipAddress;
    private String detail;
    private Instant timestamp;
}
