package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.CallSession;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.CallSessionRepository;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CallSignalingControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private DirectConversationRepository conversationRepository;
    @Autowired private CallSessionRepository callSessionRepository;
    @Autowired private MessageRepository messageRepository;

    private String aliceToken;
    private String bobToken;
    private String aliceHandle;
    private String bobHandle;
    private String conversationId;

    @BeforeEach
    void setUp() throws Exception {
        messageRepository.deleteAll();
        callSessionRepository.deleteAll();
        conversationRepository.deleteAll();
        userRepository.deleteAll();

        aliceToken = registerAndGetToken("Alice Call", "alice_call@example.com", "password123");
        bobToken = registerAndGetToken("Bob Call", "bob_call@example.com", "password123");

        aliceHandle = userRepository.findByEmail("alice_call@example.com")
                .orElseThrow().getUniqueHandle();
        bobHandle = userRepository.findByEmail("bob_call@example.com")
                .orElseThrow().getUniqueHandle();

        // Create a DM conversation between alice and bob using their unique handles
        DirectConversation conv = new DirectConversation();
        conv.setParticipants(List.of(aliceHandle, bobHandle));
        conv.setCreatedAt(Instant.now());
        conversationId = conversationRepository.save(conv).getId();
    }

    private String registerAndGetToken(String displayName, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName(displayName);
        request.setEmail(email);
        request.setPassword(password);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        VerifyEmailOtpRequest verifyRequest = new VerifyEmailOtpRequest();
        verifyRequest.setEmail(email);
        verifyRequest.setCode(user.getEmailVerificationToken());

        String body = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(body).get("token").asText();
    }

    // ── GET /api/v1/calls/{conversationId}/history ──────────────────────────

    @Test
    void getCallHistory_emptyWhenNoCalls() throws Exception {
        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getCallHistory_returnsExistingCallSessions() throws Exception {
        CallSession session = new CallSession();
        session.setConversationId(conversationId);
        session.setCallerId(aliceHandle);
        session.setCalleeId(bobHandle);
        session.setCallType(CallSession.CallType.AUDIO);
        session.setStatus(CallSession.CallStatus.ENDED);
        session.setStartedAt(Instant.now().minusSeconds(120));
        session.setAnsweredAt(Instant.now().minusSeconds(90));
        session.setEndedAt(Instant.now().minusSeconds(30));
        session.setDurationSeconds(60);
        callSessionRepository.save(session);

        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].callerId").value(aliceHandle))
                .andExpect(jsonPath("$[0].calleeId").value(bobHandle))
                .andExpect(jsonPath("$[0].callType").value("AUDIO"))
                .andExpect(jsonPath("$[0].status").value("ENDED"))
                .andExpect(jsonPath("$[0].durationSeconds").value(60));
    }

    @Test
    void getCallHistory_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getCallHistory_returns404ForNonParticipant() throws Exception {
        String eveToken = registerAndGetToken("Eve Call", "eve_call@example.com", "password123");

        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + eveToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getCallHistory_multipleSessionsReturnedNewestFirst() throws Exception {
        CallSession session1 = new CallSession();
        session1.setConversationId(conversationId);
        session1.setCallerId(aliceHandle);
        session1.setCalleeId(bobHandle);
        session1.setCallType(CallSession.CallType.AUDIO);
        session1.setStatus(CallSession.CallStatus.ENDED);
        session1.setStartedAt(Instant.now().minusSeconds(300));
        session1.setDurationSeconds(60);
        callSessionRepository.save(session1);

        CallSession session2 = new CallSession();
        session2.setConversationId(conversationId);
        session2.setCallerId(bobHandle);
        session2.setCalleeId(aliceHandle);
        session2.setCallType(CallSession.CallType.VIDEO);
        session2.setStatus(CallSession.CallStatus.MISSED);
        session2.setStartedAt(Instant.now().minusSeconds(60));
        callSessionRepository.save(session2);

        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].callType").value("VIDEO"))
                .andExpect(jsonPath("$[0].status").value("MISSED"))
                .andExpect(jsonPath("$[1].callType").value("AUDIO"))
                .andExpect(jsonPath("$[1].status").value("ENDED"));
    }
}
