package com.substring.chat.controllers;

import com.substring.chat.dto.request.ForgotPasswordRequest;
import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.ResendVerificationRequest;
import com.substring.chat.dto.request.ResetPasswordRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.dto.response.AuthResponse;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.services.AuthRateLimiter;
import com.substring.chat.services.AuthService;
import com.substring.chat.services.SecurityAuditService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final AuthRateLimiter authRateLimiter;
    private final SecurityAuditService auditService;

    @Value("${jwt.expiry-ms:900000}")
    private int jwtExpiryMs;

    @Value("${refresh.expiry-days:30}")
    private int refreshExpiryDays;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    /**
     * Phase 2: Registration creates a pending user and sends a 6-digit OTP.
     * Does NOT return a JWT — client must proceed to /verify-email.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                      HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        if (!authRateLimiter.isRegisterAllowed(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"detail\":\"Too many registration attempts. Please try again later.\"}");
        }
        try {
            authService.register(request, ip);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Verification code sent to your email. Please check your inbox."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("detail", e.getMessage()));
        }
    }

    /**
     * Phase 2: OTP-based email verification — activates account and issues JWT.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmailOtp(@Valid @RequestBody VerifyEmailOtpRequest request,
                                            HttpServletRequest httpRequest,
                                            HttpServletResponse response) {
        try {
            String ip = resolveClientIp(httpRequest);
            AuthService.LoginResult result = authService.verifyEmailOtp(
                    request, ip, httpRequest.getHeader("User-Agent"));
            setJwtCookie(response, result.authResponse().getToken());
            setRefreshCookie(response, result.refreshToken().getToken());
            return ResponseEntity.ok(result.authResponse());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", e.getMessage()));
        }
    }

    /**
     * Phase 2: Resend OTP to email. Always returns 200 (prevents email enumeration).
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request,
            HttpServletRequest httpRequest) {
        authService.resendVerification(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "If that email has a pending account, a new code has been sent."));
    }

    /**
     * Legacy link-based email verification (GET with token). Kept for backward compatibility.
     */
    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmailLink(@RequestParam String token, HttpServletRequest httpRequest) {
        try {
            authService.verifyEmailByLink(token, resolveClientIp(httpRequest));
            return ResponseEntity.ok(Map.of("message", "Email verified successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", "Invalid or expired verification link."));
        }
    }

    /**
     * Phase 3: Login by email + password. Rejects unverified accounts.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse response) {
        String ip = resolveClientIp(httpRequest);
        if (!authRateLimiter.isLoginAllowed(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"detail\":\"Too many login attempts. Please try again in 15 minutes.\"}");
        }
        try {
            AuthService.LoginResult result = authService.login(request, ip, httpRequest.getHeader("User-Agent"));
            setJwtCookie(response, result.authResponse().getToken());
            setRefreshCookie(response, result.refreshToken().getToken());
            return ResponseEntity.ok(result.authResponse());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"detail\":\"" + e.getMessage().replace("\"", "'") + "\"}");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest, HttpServletResponse response,
                                       Principal principal) {
        String refreshToken = extractRefreshCookie(httpRequest);
        String username = principal != null ? principal.getName() : null;
        String ip = resolveClientIp(httpRequest);
        authService.logout(username, refreshToken, ip);
        clearJwtCookie(response);
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest httpRequest, HttpServletResponse response) {
        String refreshToken = extractRefreshCookie(httpRequest);
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "No refresh token present"));
        }
        try {
            String ip = resolveClientIp(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            AuthService.RefreshResult result = authService.refreshAndRotate(refreshToken, ip, userAgent);
            setJwtCookie(response, result.authResponse().getToken());
            setRefreshCookie(response, result.newRefreshToken().getToken());
            return ResponseEntity.ok(result.authResponse());
        } catch (RuntimeException e) {
            clearRefreshCookie(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "Session expired. Please log in again."));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        authService.forgotPassword(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "If that email is registered, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        try {
            authService.resetPassword(request, resolveClientIp(httpRequest));
            return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(UserResponse.from(user));
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if ("refreshToken".equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true).path("/").maxAge(jwtExpiryMs / 1000)
                .secure(cookieSecure).sameSite("Strict").build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void setRefreshCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", token)
                .httpOnly(true).path("/api/v1/auth/refresh")
                .maxAge(refreshExpiryDays * 86_400L)
                .secure(cookieSecure).sameSite("Strict").build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearJwtCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("token", "")
                .httpOnly(true).path("/").maxAge(0)
                .secure(cookieSecure).sameSite("Strict").build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).path("/api/v1/auth/refresh").maxAge(0)
                .secure(cookieSecure).sameSite("Strict").build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
