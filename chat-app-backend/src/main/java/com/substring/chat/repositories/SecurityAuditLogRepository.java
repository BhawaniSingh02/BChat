package com.substring.chat.repositories;

import com.substring.chat.entities.SecurityAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SecurityAuditLogRepository extends MongoRepository<SecurityAuditLog, String> {
}
