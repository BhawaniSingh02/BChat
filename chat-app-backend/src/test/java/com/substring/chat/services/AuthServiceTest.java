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
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        User savedUser = new User();
        savedUser.setId("user-id-1");
        savedUser.setEmail("alice@example.com");
        savedUser.setUsername("alice@example.com");
        savedUser.setDisplayName("Alice Smith");
        savedUser.setEmailVerified(false);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // register() now returns void — just verify no exception
        authService.register(registerRequest, "127.0.0.1");
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest, "127.0.0.1"))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("alice@example.com");
    }

    // ── verifyEmailOtp ────────────────────────────────────────────────────────

    @Test
    void verifyEmailOtp_successfullyActivatesAndReturnsJwt() {
        User pendingUser = new User();
        pendingUser.setId("user-id-1");
        pendingUser.setEmail("alice@example.com");
        pendingUser.setUsername("alice@example.com");
        pendingUser.setDisplayName("Alice Smith");
        pendingUser.setEmailVerified(false);
        pendingUser.setEmailVerificationToken("123456");
        pendingUser.setEmailVerificationExpiry(Instant.now().plusSeconds(300));

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(pendingUser));
        when(userRepository.existsByUniqueHandle(anyString())).thenReturn(false);

        User activated = new User();
        activated.setId("user-id-1");
        activated.setEmail("alice@example.com");
        activated.setUsername("alice.smith.1234");
        activated.setUniqueHandle("alice.smith.1234");
        activated.setDisplayName("Alice Smith");
        activated.setEmailVerified(true);
        activated.setWhoCanMessage("APPROVED_ONLY");
        when(userRepository.save(any(User.class))).thenReturn(activated);
        when(jwtTokenProvider.generateToken("alice.smith.1234")).thenReturn("jwt-token");

        RefreshToken fakeRefreshToken = new RefreshToken();
        fakeRefreshToken.setToken("refresh-token-value");
        fakeRefreshToken.setExpiresAt(Instant.now().plusSeconds(86400));
        when(refreshTokenService.create(anyString(), anyString(), anyString())).thenReturn(fakeRefreshToken);

        VerifyEmailOtpRequest req = new VerifyEmailOtpRequest();
        req.setEmail("alice@example.com");
        req.setCode("123456");

        AuthService.LoginResult result = authService.verifyEmailOtp(req, "127.0.0.1", "TestAgent/1.0");

        assertThat(result.authResponse().getToken()).isEqualTo("jwt-token");
        assertThat(result.authResponse().getUniqueHandle()).isEqualTo("alice.smith.1234");
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
