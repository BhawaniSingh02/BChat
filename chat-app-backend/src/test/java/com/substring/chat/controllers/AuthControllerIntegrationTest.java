package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.LoginRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    /**
     * Phase 2: Register + OTP verify → returns JWT token.
     * Reads the OTP directly from the DB (mail is disabled in test profile).
     */
    private String registerAndGetToken(String displayName, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName(displayName);
        request.setEmail(email);
        request.setPassword(password);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Read OTP from DB (email not sent in test profile)
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after registration"));
        String otp = user.getEmailVerificationToken();

        VerifyEmailOtpRequest verifyRequest = new VerifyEmailOtpRequest();
        verifyRequest.setEmail(email);
        verifyRequest.setCode(otp);

        String response = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(response).get("token").asText();
        // New flow: the public @handle is chosen after verification. Claim one so the
        // rest of the test has a searchable, conversation-ready handle.
        claimHandle(token, email);
        return token;
    }

    /** Claim a valid @handle derived from the email's local part. */
    private void claimHandle(String token, String email) throws Exception {
        String handle = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._]", "");
        if (handle.length() < 3) handle = handle + "user";
        mockMvc.perform(post("/api/v1/users/me/handle")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"handle\":\"" + handle + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void register_returns201WithMessage() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Test User");
        request.setEmail("testuser@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void register_returns409WhenVerifiedEmailAlreadyExists() throws Exception {
        // Fully register AND verify the first account, so the email is taken.
        registerAndGetToken("First User", "first@example.com", "password123");

        RegisterRequest duplicate = new RegisterRequest();
        duplicate.setDisplayName("Duplicate User");
        duplicate.setEmail("first@example.com"); // same, already-verified email
        duplicate.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict());
    }

    @Test
    void register_allowsReRegisteringAnUnverifiedEmail() throws Exception {
        // A pending (unverified) account may be re-registered — the OTP is simply
        // re-issued. This is intended so users who never verified can start over.
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Pending User");
        request.setEmail("pending@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Same email, still unverified → allowed again (201, not 409)
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void register_returns400WhenFieldsMissing() throws Exception {
        RegisterRequest request = new RegisterRequest();
        // displayName missing
        request.setEmail("not-an-email");
        request.setPassword("123"); // too short

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_returns400WhenOtpIsWrong() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("OTP Test User");
        request.setEmail("otptest@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        VerifyEmailOtpRequest bad = new VerifyEmailOtpRequest();
        bad.setEmail("otptest@example.com");
        bad.setCode("000000"); // wrong code

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bad)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_returns200WithTokenAfterRegistrationAndVerification() throws Exception {
        String token = registerAndGetToken("Login User", "loginuser@example.com", "securepass");

        // Get unique handle for this user
        User user = userRepository.findByEmail("loginuser@example.com").orElseThrow();
        String handle = user.getUniqueHandle();

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("loginuser@example.com");
        loginRequest.setPassword("securepass");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.uniqueHandle").value(handle));
    }

    @Test
    void login_succeedsWithUsernameInsteadOfEmail() throws Exception {
        registerAndGetToken("Handle Login", "handlelogin@example.com", "securepass");
        String handle = userRepository.findByEmail("handlelogin@example.com").orElseThrow().getUniqueHandle();

        // Plain handle
        LoginRequest byHandle = new LoginRequest();
        byHandle.setEmail(handle);
        byHandle.setPassword("securepass");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(byHandle)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.uniqueHandle").value(handle));

        // With a leading "@" and different casing
        LoginRequest byAtHandle = new LoginRequest();
        byAtHandle.setEmail("@" + handle.toUpperCase());
        byAtHandle.setPassword("securepass");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(byAtHandle)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueHandle").value(handle));
    }

    @Test
    void login_returns401WithUnknownUsername() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("nosuchhandle");
        req.setPassword("whatever");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns401WithWrongPassword() throws Exception {
        registerAndGetToken("Secure User", "secure@example.com", "correctpassword");

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("secure@example.com");
        loginRequest.setPassword("wrongpassword");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns401WhenEmailNotVerified() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Unverified User");
        request.setEmail("unverified@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("unverified@example.com");
        loginRequest.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_setsHttpOnlyAuthCookiesWithDefaultSameSite() throws Exception {
        registerAndGetToken("Cookie User", "cookie@example.com", "securepass");

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("cookie@example.com");
        loginRequest.setPassword("securepass");

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        List<String> cookies = result.getResponse().getHeaders("Set-Cookie");
        // Access token cookie: HttpOnly + default SameSite=Strict
        assertThat(cookies).anySatisfy(c -> assertThat(c)
                .contains("token=").contains("HttpOnly").contains("SameSite=Strict"));
        // Refresh cookie: scoped to the refresh endpoint, HttpOnly
        assertThat(cookies).anySatisfy(c -> assertThat(c)
                .contains("refreshToken=").contains("Path=/api/v1/auth/refresh").contains("HttpOnly"));
    }

    @Test
    void getMe_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMe_returnsUserWithValidToken() throws Exception {
        String token = registerAndGetToken("Me User", "meuser@example.com", "password123");
        User user = userRepository.findByEmail("meuser@example.com").orElseThrow();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueHandle").value(user.getUniqueHandle()))
                .andExpect(jsonPath("$.email").value("meuser@example.com"));
    }
}
