package com.substring.chat.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Sends transactional email via the Brevo (formerly Sendinblue) HTTP API.
 *
 * Why Brevo instead of raw SMTP:
 *   Render's free tier blocks outbound TCP on ports 25, 465, and 587 (all standard SMTP ports).
 *   Brevo communicates over HTTPS (port 443), which is never blocked on Render.
 *
 * Why Brevo instead of Resend/SendGrid/Mailgun:
 *   Those services require DNS records on a domain you own to verify the sending address.
 *   Brevo allows verifying a single sender e-mail address (e.g. your Gmail) just by
 *   clicking a confirmation link — no DNS records and no domain ownership needed.
 *
 * One-time setup (takes ~2 minutes):
 *   1. Sign up at https://app.brevo.com  (free — 300 emails/day, no credit card)
 *   2. Senders & IPs → Add a New Sender → enter your Gmail address → click the
 *      verification link Brevo sends to that Gmail.
 *   3. Settings → API Keys → Generate a new key → copy it.
 *   4. Set two environment variables on Render:
 *        BREVO_API_KEY     — the key from step 3
 *        BREVO_SENDER_EMAIL — the Gmail you verified in step 2
 *
 * Local development:
 *   Leave BREVO_API_KEY unset. The service logs the email body to the console so the
 *   OTP is visible in local logs without needing real credentials.
 */
@Service
@Slf4j
public class EmailService {

    private static final String BREVO_SEND_URL = "/v3/smtp/email";

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${brevo.sender.email:}")
    private String senderEmail;

    @Value("${brevo.sender.name:Baaat}")
    private String senderName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final RestClient restClient;

    public EmailService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl("https://api.brevo.com")
                .build();
    }

    // ── Public API (unchanged — AuthService calls these directly) ─────────────

    public void sendOtpEmail(String toEmail, String displayName, String otp) {
        send(toEmail,
                "Your Baaat verification code",
                String.format(
                        "Hi %s,%n%n" +
                        "Your Baaat verification code is:%n%n" +
                        "    %s%n%n" +
                        "This code is valid for 15 minutes. Do not share it with anyone.%n%n" +
                        "If you did not create an account, you can safely ignore this email.%n%n" +
                        "— The Baaat Team",
                        displayName, otp));
    }

    public void sendPasswordResetEmail(String toEmail, String displayName, String resetToken) {
        String link = frontendUrl + "/reset-password?token=" + resetToken;
        send(toEmail,
                "Reset your Baaat password",
                String.format(
                        "Hi %s,%n%n" +
                        "We received a request to reset your Baaat password.%n%n" +
                        "Click the link below to set a new password (valid for 1 hour):%n%n" +
                        "%s%n%n" +
                        "If you did not request a password reset, you can safely ignore this email.%n%n" +
                        "— The Baaat Team",
                        displayName, link));
    }

    public void sendVerificationEmail(String toEmail, String displayName, String verificationToken) {
        String link = frontendUrl + "/verify-email?token=" + verificationToken;
        send(toEmail,
                "Verify your Baaat email address",
                String.format(
                        "Hi %s,%n%n" +
                        "Welcome to Baaat! Please verify your email address by clicking the " +
                        "link below (valid for 24 hours):%n%n" +
                        "%s%n%n" +
                        "If you did not create an account, you can safely ignore this email.%n%n" +
                        "— The Baaat Team",
                        displayName, link));
    }

    /** Returns true when BREVO_API_KEY is present — used by health/diagnostics. */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    // ── Internal transport ────────────────────────────────────────────────────

    private void send(String to, String subject, String text) {
        if (!isConfigured()) {
            // Local dev fallback — OTP visible in console logs
            log.info("[EMAIL DISABLED] To: {} | Subject: {} | Body preview: {}",
                    to, subject, text.substring(0, Math.min(120, text.length())));
            return;
        }

        // Brevo API payload — https://developers.brevo.com/reference/sendtransacemail
        Map<String, Object> payload = Map.of(
                "sender",      Map.of("name", senderName, "email", senderEmail),
                "to",          List.of(Map.of("email", to)),
                "subject",     subject,
                "textContent", text
        );

        try {
            restClient.post()
                    .uri(BREVO_SEND_URL)
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[EMAIL] Sent '{}' to {}", subject, to);

        } catch (RestClientResponseException e) {
            log.error("[EMAIL] Brevo API error sending to {}: HTTP {} — {}",
                    to, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Email delivery failed. Please try again later.");

        } catch (Exception e) {
            log.error("[EMAIL] Unexpected error sending to {}: {}", to, e.getMessage());
            throw new RuntimeException("Email delivery failed. Please try again later.");
        }
    }
}
