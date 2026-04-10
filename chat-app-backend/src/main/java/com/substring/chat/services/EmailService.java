package com.substring.chat.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${spring.mail.from:noreply@baaat.app}")
    private String fromAddress;

    public void sendPasswordResetEmail(String toEmail, String username, String resetToken) {
        String link = baseUrl + "/reset-password?token=" + resetToken;
        String subject = "Reset your Baaat password";
        String body = String.format(
                "Hi %s,\n\n" +
                "We received a request to reset your Baaat password.\n\n" +
                "Click the link below to set a new password (valid for 1 hour):\n\n" +
                "%s\n\n" +
                "If you did not request a password reset, you can safely ignore this email.\n\n" +
                "— The Baaat Team",
                username, link);
        send(toEmail, subject, body);
    }

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        String link = baseUrl + "/verify-email?token=" + verificationToken;
        String subject = "Verify your Baaat email address";
        String body = String.format(
                "Hi %s,\n\n" +
                "Welcome to Baaat! Please verify your email address by clicking the link below (valid for 24 hours):\n\n" +
                "%s\n\n" +
                "If you did not create an account, you can safely ignore this email.\n\n" +
                "— The Baaat Team",
                username, link);
        send(toEmail, subject, body);
    }

    public void sendOtpEmail(String toEmail, String displayName, String otp) {
        String subject = "Your Baaat verification code";
        String body = String.format(
                "Hi %s,\n\n" +
                "Your Baaat verification code is:\n\n" +
                "    %s\n\n" +
                "This code is valid for 15 minutes. Do not share it with anyone.\n\n" +
                "If you did not create an account, you can safely ignore this email.\n\n" +
                "— The Baaat Team",
                displayName, otp);
        send(toEmail, subject, body);
    }

    private void send(String to, String subject, String body) {
        if (mailSender == null) {
            log.info("[EMAIL DISABLED] To: {} | Subject: {} | Body preview: {}", to, subject,
                    body.substring(0, Math.min(80, body.length())));
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public boolean isConfigured() {
        return mailSender != null;
    }
}
