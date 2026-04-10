package com.substring.chat.services;

import com.substring.chat.dto.request.ForgotPasswordRequest;
import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.ResendVerificationRequest;
import com.substring.chat.dto.request.ResetPasswordRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.dto.response.AuthResponse;
import com.substring.chat.entities.PasswordResetToken;
import com.substring.chat.entities.RefreshToken;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserAlreadyExistsException;
import com.substring.chat.repositories.PasswordResetTokenRepository;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 10;
    private static final int LOCKOUT_MINUTES = 30;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final SecurityAuditService auditService;
    private final EmailService emailService;

    public record LoginResult(AuthResponse authResponse, RefreshToken refreshToken) {}

    /**
     * Phase 2: Registration creates a pending (unverified) user and sends a 6-digit OTP.
     * No JWT is returned — the client must proceed to email verification.
     */
    public void register(RegisterRequest request, String ip) {
        Optional<User> existing = userRepository.findByEmail(request.getEmail());

        if (existing.isPresent() && existing.get().isEmailVerified()) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        // Reuse the pending (unverified) account if it exists, otherwise create a new one
        User user = existing.orElseGet(() -> {
            User u = new User();
            u.setInternalId(UUID.randomUUID().toString());
            u.setEmail(request.getEmail());
            u.setUsername(request.getEmail());
            u.setCreatedAt(Instant.now());
            u.setEmailVerified(false);
            u.setWhoCanMessage("APPROVED_ONLY");
            return u;
        });

        user.setDisplayName(request.getDisplayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setLastSeen(Instant.now());

        String otp = generateOtp();
        user.setEmailVerificationToken(otp);
        user.setEmailVerificationExpiry(Instant.now().plusSeconds(15 * 60)); // 15 min

        userRepository.save(user);
        emailService.sendOtpEmail(user.getEmail(), user.getDisplayName(), otp);
        auditService.log("REGISTER_PENDING", user.getEmail(), ip, "Pending email verification");
    }

    /**
     * Phase 2: Verify OTP, activate account, generate uniqueHandle, issue JWT.
     */
    public LoginResult verifyEmailOtp(VerifyEmailOtpRequest request, String ip, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found for this email"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email is already verified. Please log in.");
        }

        if (user.getEmailVerificationToken() == null
                || !user.getEmailVerificationToken().equals(request.getCode())) {
            throw new RuntimeException("Invalid verification code");
        }

        if (user.getEmailVerificationExpiry() == null
                || Instant.now().isAfter(user.getEmailVerificationExpiry())) {
            throw new RuntimeException("Verification code has expired. Please request a new one.");
        }

        // Generate a unique handle: {displayNameSlug}.{4-digit-random}
        String handle = generateUniqueHandle(user.getDisplayName());
        user.setUniqueHandle(handle);
        user.setUsername(handle); // update Spring Security principal to uniqueHandle
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiry(null);
        User saved = userRepository.save(user);

        String accessToken = jwtTokenProvider.generateToken(saved.getUsername());
        RefreshToken refreshToken = refreshTokenService.create(saved.getUsername(), ip, userAgent);
        auditService.log("EMAIL_VERIFIED", saved.getUsername(), ip, "Account activated via OTP");

        return new LoginResult(
                new AuthResponse(accessToken, saved.getUsername(), saved.getEmail(),
                        saved.getId(), saved.getUniqueHandle(), saved.getWhoCanMessage()),
                refreshToken);
    }

    /**
     * Phase 2: Resend OTP (rate-limited at controller layer).
     */
    public void resendVerification(ResendVerificationRequest request, String ip) {
        // Always silent — prevents email enumeration
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty() || userOpt.get().isEmailVerified()) return;

        User user = userOpt.get();
        String otp = generateOtp();
        user.setEmailVerificationToken(otp);
        user.setEmailVerificationExpiry(Instant.now().plusSeconds(15 * 60));
        userRepository.save(user);
        emailService.sendOtpEmail(user.getEmail(), user.getDisplayName(), otp);
        auditService.log("RESEND_OTP", user.getEmail(), ip, "Verification code resent");
    }

    /**
     * Phase 3: Login by email + password. Rejects unverified accounts.
     */
    public LoginResult login(LoginRequest request, String ip, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        // Check lockout
        if (user != null && user.getAccountLockedUntil() != null
                && Instant.now().isBefore(user.getAccountLockedUntil())) {
            long minutesLeft = (user.getAccountLockedUntil().getEpochSecond() - Instant.now().getEpochSecond()) / 60;
            throw new RuntimeException("Account is temporarily locked. Try again in " + Math.max(1, minutesLeft) + " minute(s).");
        }

        // Reject unverified accounts before touching the auth manager
        if (user != null && !user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email address before logging in.");
        }

        // Authenticate using the stored username (= uniqueHandle for verified users)
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user != null ? user.getUsername() : request.getEmail(),
                            request.getPassword()));
        } catch (BadCredentialsException e) {
            if (user != null) {
                user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
                auditService.logLoginFailed(user.getUsername(), ip);
                if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
                    user.setAccountLockedUntil(Instant.now().plusSeconds(LOCKOUT_MINUTES * 60L));
                    user.setFailedLoginAttempts(0);
                    auditService.logAccountLocked(user.getUsername(), ip);
                    userRepository.save(user);
                    throw new RuntimeException("Account locked after too many failed attempts. Try again in " + LOCKOUT_MINUTES + " minutes.");
                }
                userRepository.save(user);
            }
            throw e;
        }

        user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        user.setLastSeen(Instant.now());
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateToken(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.create(user.getUsername(), ip, userAgent);
        auditService.logLogin(user.getUsername(), ip);

        return new LoginResult(
                new AuthResponse(accessToken, user.getUsername(), user.getEmail(),
                        user.getId(), user.getUniqueHandle(), user.getWhoCanMessage()),
                refreshToken);
    }

    public void logout(String username, String refreshTokenValue, String ip) {
        if (refreshTokenValue != null) {
            refreshTokenService.revoke(refreshTokenValue);
        }
        if (username != null) {
            auditService.logLogout(username, ip);
        }
    }

    public record RefreshResult(AuthResponse authResponse, RefreshToken newRefreshToken) {}

    public RefreshResult refreshAndRotate(String refreshTokenValue, String ip, String userAgent) {
        RefreshToken existing = refreshTokenService.validate(refreshTokenValue)
                .orElseThrow(() -> new RuntimeException("Invalid or expired refresh token"));
        String username = existing.getUsername();
        refreshTokenService.revoke(refreshTokenValue);
        RefreshToken newRefreshToken = refreshTokenService.create(username, ip, userAgent);
        String accessToken = jwtTokenProvider.generateToken(username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new RefreshResult(
                new AuthResponse(accessToken, user.getUsername(), user.getEmail(),
                        user.getId(), user.getUniqueHandle(), user.getWhoCanMessage()),
                newRefreshToken);
    }

    public void forgotPassword(ForgotPasswordRequest request, String ip) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) return;

        User user = userOpt.get();
        String token = generateSecureToken();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUsername(user.getUsername());
        resetToken.setExpiresAt(Instant.now().plusSeconds(3600));
        passwordResetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(user.getEmail(), user.getDisplayName() != null ? user.getDisplayName() : user.getUsername(), token);
        auditService.logPasswordResetRequested(user.getUsername(), ip);
    }

    public void resetPassword(ResetPasswordRequest request, String ip) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (resetToken.isUsed() || Instant.now().isAfter(resetToken.getExpiresAt())) {
            throw new RuntimeException("Reset token has expired or already been used");
        }

        User user = userRepository.findByUsername(resetToken.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        refreshTokenService.revokeAllForUser(user.getUsername());
        auditService.logPasswordReset(user.getUsername(), ip);
    }

    /** Legacy link-based email verification (kept for backward compat). */
    public void verifyEmailByLink(String token, String ip) {
        User user = userRepository.findByEmailVerificationToken(token)
                .filter(u -> u.getEmailVerificationExpiry() != null
                        && Instant.now().isBefore(u.getEmailVerificationExpiry()))
                .orElseThrow(() -> new RuntimeException("Invalid or expired verification token"));

        if (user.isEmailVerified()) return;

        // If somehow triggered for a pending OTP user, use the handle flow
        if (user.getUniqueHandle() == null) {
            String handle = generateUniqueHandle(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail());
            user.setUniqueHandle(handle);
            user.setUsername(handle);
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiry(null);
        userRepository.save(user);

        auditService.logEmailVerified(user.getUsername(), ip);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String generateOtp() {
        int code = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(code);
    }

    private String generateUniqueHandle(String displayName) {
        String prefix = (displayName == null ? "user" : displayName)
                .toLowerCase()
                .replaceAll("[^a-z0-9]", ".")
                .replaceAll("\\.+", ".")
                .replaceAll("^\\.|\\.$", "");

        if (prefix.length() < 2) prefix = "user";
        if (prefix.length() > 15) prefix = prefix.substring(0, 15);

        for (int i = 0; i < 20; i++) {
            int suffix = 1000 + RANDOM.nextInt(9000);
            String handle = prefix + "." + suffix;
            if (!userRepository.existsByUniqueHandle(handle)) {
                return handle;
            }
        }
        // Fallback: random suffix with timestamp component
        return prefix + "." + (1000 + RANDOM.nextInt(9000)) + (System.currentTimeMillis() % 100);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
