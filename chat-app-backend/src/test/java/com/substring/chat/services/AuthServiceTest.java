package com.substring.chat.services;

import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.RefreshToken;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserAlreadyExistsException;
import com.substring.chat.repositories.PasswordResetTokenRepository;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private SecurityAuditService auditService;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setDisplayName("Alice Smith");
        registerRequest.setEmail("alice@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("alice@example.com");
        loginRequest.setPassword("password123");
    }

    // ── register ─────────────────────────────────────────────────────────────

    @Test
    void register_successfullySavesUserAndSendsOtp() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(registerRequest, "127.0.0.1");

        // OTP email is sent and the pending user is persisted
        verify(emailService).sendOtpEmail(eq("alice@example.com"), eq("Alice Smith"), anyString());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        User verified = new User();
        verified.setEmail("alice@example.com");
        verified.setEmailVerified(true);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(verified));

        assertThatThrownBy(() -> authService.register(registerRequest, "127.0.0.1"))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("alice@example.com");
        // Must not touch persistence or email for an already-verified account
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_doesNotPersistUserWhenEmailDeliveryFails() {
        // Bug fix: OTP is sent before the user is saved, so a delivery failure
        // leaves no phantom pending account behind.
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        doThrow(new RuntimeException("Email delivery failed. Please try again later."))
                .when(emailService).sendOtpEmail(anyString(), anyString(), anyString());

        assertThatThrownBy(() -> authService.register(registerRequest, "127.0.0.1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email delivery failed");
        verify(userRepository, never()).save(any(User.class));
    }

    // ── verifyEmailOtp ────────────────────────────────────────────────────────

    @Test
    void verifyEmailOtp_activatesWithOpaqueIdentityAndNoHandleYet() {
        User pendingUser = new User();
        pendingUser.setId("user-id-1");
        pendingUser.setEmail("alice@example.com");
        pendingUser.setUsername("alice@example.com");
        pendingUser.setInternalId("internal-1");
        pendingUser.setDisplayName("Alice Smith");
        pendingUser.setEmailVerified(false);
        pendingUser.setEmailVerificationToken("123456");
        pendingUser.setEmailVerificationExpiry(Instant.now().plusSeconds(300));

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(pendingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken("internal-1")).thenReturn("jwt-token");

        RefreshToken fakeRefreshToken = new RefreshToken();
        fakeRefreshToken.setToken("refresh-token-value");
        fakeRefreshToken.setExpiresAt(Instant.now().plusSeconds(86400));
        when(refreshTokenService.create(anyString(), anyString(), anyString())).thenReturn(fakeRefreshToken);

        VerifyEmailOtpRequest req = new VerifyEmailOtpRequest();
        req.setEmail("alice@example.com");
        req.setCode("123456");

        AuthService.LoginResult result = authService.verifyEmailOtp(req, "127.0.0.1", "TestAgent/1.0");

        assertThat(result.authResponse().getToken()).isEqualTo("jwt-token");
        // Identity is the opaque internal id; the public @handle is chosen later (null now).
        assertThat(result.authResponse().getUsername()).isEqualTo("internal-1");
        assertThat(result.authResponse().getUniqueHandle()).isNull();
        assertThat(result.refreshToken().getToken()).isEqualTo("refresh-token-value");
    }

    @Test
    void verifyEmailOtp_throwsWhenCodeIsWrong() {
        User pendingUser = new User();
        pendingUser.setEmail("alice@example.com");
        pendingUser.setEmailVerified(false);
        pendingUser.setEmailVerificationToken("111111");
        pendingUser.setEmailVerificationExpiry(Instant.now().plusSeconds(300));

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(pendingUser));

        VerifyEmailOtpRequest req = new VerifyEmailOtpRequest();
        req.setEmail("alice@example.com");
        req.setCode("999999");

        assertThatThrownBy(() -> authService.verifyEmailOtp(req, "127.0.0.1", "agent"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid verification code");
    }

    @Test
    void verifyEmailOtp_throwsWhenCodeExpired() {
        User pendingUser = new User();
        pendingUser.setEmail("alice@example.com");
        pendingUser.setEmailVerified(false);
        pendingUser.setEmailVerificationToken("123456");
        pendingUser.setEmailVerificationExpiry(Instant.now().minusSeconds(1));

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(pendingUser));

        VerifyEmailOtpRequest req = new VerifyEmailOtpRequest();
        req.setEmail("alice@example.com");
        req.setCode("123456");

        assertThatThrownBy(() -> authService.verifyEmailOtp(req, "127.0.0.1", "agent"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void verifyEmailOtp_throwsWhenAlreadyVerified() {
        User alreadyVerified = new User();
        alreadyVerified.setEmail("alice@example.com");
        alreadyVerified.setEmailVerified(true);

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(alreadyVerified));

        VerifyEmailOtpRequest req = new VerifyEmailOtpRequest();
        req.setEmail("alice@example.com");
        req.setCode("123456");

        assertThatThrownBy(() -> authService.verifyEmailOtp(req, "127.0.0.1", "agent"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already verified");
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_successfullyAuthenticatesVerifiedUser() {
        User user = new User();
        user.setId("user-id-1");
        user.setUsername("alice.smith.1234");
        user.setEmail("alice@example.com");
        user.setEmailVerified(true);
        user.setUniqueHandle("alice.smith.1234");
        user.setWhoCanMessage("APPROVED_ONLY");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtTokenProvider.generateToken("alice.smith.1234")).thenReturn("jwt-token");

        RefreshToken fakeRefreshToken = new RefreshToken();
        fakeRefreshToken.setToken("refresh-token-value");
        fakeRefreshToken.setExpiresAt(Instant.now().plusSeconds(86400));
        when(refreshTokenService.create(anyString(), anyString(), anyString())).thenReturn(fakeRefreshToken);

        AuthService.LoginResult result = authService.login(loginRequest, "127.0.0.1", "TestAgent/1.0");

        assertThat(result.authResponse().getToken()).isEqualTo("jwt-token");
        assertThat(result.authResponse().getUniqueHandle()).isEqualTo("alice.smith.1234");
    }

    @Test
    void login_throwsWhenEmailNotVerified() {
        User unverifiedUser = new User();
        unverifiedUser.setUsername("alice@example.com");
        unverifiedUser.setEmail("alice@example.com");
        unverifiedUser.setEmailVerified(false);

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1", "TestAgent/1.0"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("verify your email");
    }

    @Test
    void login_throwsOnBadCredentials() {
        // email not found → user is null
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1", "TestAgent/1.0"))
                .isInstanceOf(BadCredentialsException.class);
    }
}
