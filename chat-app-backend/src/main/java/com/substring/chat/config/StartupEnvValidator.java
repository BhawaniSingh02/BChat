package com.substring.chat.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Runs at startup and logs a clear ERROR for every required env var that is missing or blank.
 * This replaces cryptic "Injection of autowired dependencies failed" messages with actionable output.
 */
@Component
@Slf4j
public class StartupEnvValidator implements ApplicationRunner {

    @Value("${spring.data.mongodb.uri:}")
    private String mongoUri;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${app.base-url:}")
    private String appBaseUrl;

    @Value("${app.frontend-url:}")
    private String frontendUrl;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:}")
    private String brevoSenderEmail;

    @Override
    public void run(ApplicationArguments args) {
        List<String> missing = new ArrayList<>();

        if (blank(mongoUri))      missing.add("MONGODB_URI         (spring.data.mongodb.uri)");
        if (blank(jwtSecret))     missing.add("JWT_SECRET          (jwt.secret)");
        if (blank(allowedOrigins)) missing.add("ALLOWED_ORIGINS     (cors.allowed-origins)");
        if (blank(appBaseUrl))    missing.add("APP_BASE_URL        (app.base-url)");
        if (blank(frontendUrl))   missing.add("FRONTEND_URL        (app.frontend-url)");
        if (blank(brevoApiKey))      missing.add("BREVO_API_KEY       (brevo.api-key)         — email will be disabled without this");
        if (blank(brevoSenderEmail)) missing.add("BREVO_SENDER_EMAIL  (brevo.sender.email)    — verified sender Gmail address");

        if (!missing.isEmpty()) {
            log.error("===========================================================");
            log.error("MISSING REQUIRED ENVIRONMENT VARIABLES — set these on Render:");
            missing.forEach(v -> log.error("  • {}", v));
            log.error("===========================================================");
        } else {
            log.info("[StartupEnvValidator] All required env vars are present.");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
