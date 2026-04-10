package com.substring.chat.services;

import com.substring.chat.entities.SecurityAuditLog;
import com.substring.chat.repositories.SecurityAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityAuditService {

    private final SecurityAuditLogRepository auditLogRepository;

    public void log(String eventType, String username, String ipAddress, String detail) {
        try {
            SecurityAuditLog entry = new SecurityAuditLog();
            entry.setEventType(eventType);
            entry.setUsername(username);
            entry.setIpAddress(ipAddress);
            entry.setDetail(detail);
            entry.setTimestamp(Instant.now());
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Audit log must never crash the main flow
            log.error("Failed to write audit log entry: eventType={}, username={}", eventType, username, e);
        }
    }

    public void logLogin(String username, String ip) {
        log("LOGIN", username, ip, "Successful login");
    }

    public void logLoginFailed(String username, String ip) {
        log("LOGIN_FAILED", username, ip, "Failed login attempt");
    }

    public void logAccountLocked(String username, String ip) {
        log("ACCOUNT_LOCKED", username, ip, "Account locked after repeated failed attempts");
    }

    public void logLogout(String username, String ip) {
        log("LOGOUT", username, ip, "User logged out");
    }

    public void logPasswordChange(String username, String ip) {
        log("PASSWORD_CHANGE", username, ip, "Password changed");
    }

    public void logPasswordReset(String username, String ip) {
        log("PASSWORD_RESET", username, ip, "Password reset completed");
    }

    public void logPasswordResetRequested(String username, String ip) {
        log("PASSWORD_RESET_REQUESTED", username, ip, "Password reset email requested");
    }

    public void logEmailVerified(String username, String ip) {
        log("EMAIL_VERIFIED", username, ip, "Email address verified");
    }
}
