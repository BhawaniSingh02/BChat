package com.substring.chat.services;

import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
@Slf4j
public class EmailService {

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${spring.mail.from:noreply@baaat.app}")
    private String fromAddress;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String baseUrl;

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

    public void sendPasswordResetEmail(String toEmail, String displayName, String resetToken) {
        String link = baseUrl + "/reset-password?token=" + resetToken;
        String subject = "Reset your Baaat password";
        String body = String.format(
                "Hi %s,\n\n" +
                "We received a request to reset your Baaat password.\n\n" +
                "Click the link below to set a new password (valid for 1 hour):\n\n" +
                "%s\n\n" +
                "If you did not request a password reset, you can safely ignore this email.\n\n" +
                "— The Baaat Team",
                displayName, link);
        send(toEmail, subject, body);
    }

    public void sendVerificationEmail(String toEmail, String displayName, String verificationToken) {
        String link = baseUrl + "/verify-email?token=" + verificationToken;
        String subject = "Verify your Baaat email address";
        String body = String.format(
                "Hi %s,\n\n" +
                "Welcome to Baaat! Please verify your email address by clicking the link below (valid for 24 hours):\n\n" +
                "%s\n\n" +
                "If you did not create an account, you can safely ignore this email.\n\n" +
                "— The Baaat Team",
                displayName, link);
        send(toEmail, subject, body);
    }

    public boolean isConfigured() {
        return host != null && !host.isBlank();
    }

    private void send(String to, String subject, String body) {
        if (host == null || host.isBlank()) {
            log.info("[EMAIL DISABLED] To: {} | Subject: {} | Body preview: {}",
                    to, subject, body.substring(0, Math.min(80, body.length())));
            return;
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        final String user = username;
        final String pass = password;

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(user, pass);
            }
        });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromAddress));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            message.setSubject(subject);
            message.setText(body);
            Transport.send(message);
            log.info("[EMAIL] Sent '{}' to {}", subject, to);
        } catch (MessagingException e) {
            log.error("[EMAIL] Failed to send to {}: {}", to, e.getMessage());
        }
    }
}
