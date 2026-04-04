package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.entities.CallSession;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.repositories.CallSessionRepository;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
    private String conversationId;

    @BeforeEach
    void setUp() throws Exception {
        messageRepository.deleteAll();
        callSessionRepository.deleteAll();
        conversationRepository.deleteAll();
        userRepository.deleteAll();

        aliceToken = registerAndGetToken("alice_call", "alice_call@example.com", "password123");
        bobToken = registerAndGetToken("bob_call", "bob_call@example.com", "password123");

        // Create a DM conversation between alice and bob
        DirectConversation conv = new DirectConversation();
        conv.setParticipants(List.of("alice_call", "bob_call"));
        conv.setCreatedAt(Instant.now());
        conversationId = conversationRepository.save(conv).getId();
    }

    private String registerAndGetToken(String username, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);

        String body = mockMvc.perform(
                        post("/api/v1/auth/register")
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

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
        // Seed a call session directly
        CallSession session = new CallSession();
        session.setConversationId(conversationId);
        session.setCallerId("alice_call");
        session.setCalleeId("bob_call");
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
                .andExpect(jsonPath("$[0].callerId").value("alice_call"))
                .andExpect(jsonPath("$[0].calleeId").value("bob_call"))
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
        // Register a third user who is not in the conversation
        String eveToken = registerAndGetToken("eve_call", "eve_call@example.com", "password123");

        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + eveToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getCallHistory_multipleSessionsReturnedNewestFirst() throws Exception {
        // Seed two sessions
        CallSession session1 = new CallSession();
        session1.setConversationId(conversationId);
        session1.setCallerId("alice_call");
        session1.setCalleeId("bob_call");
        session1.setCallType(CallSession.CallType.AUDIO);
        session1.setStatus(CallSession.CallStatus.ENDED);
        session1.setStartedAt(Instant.now().minusSeconds(300));
        session1.setDurationSeconds(60);
        callSessionRepository.save(session1);

        CallSession session2 = new CallSession();
        session2.setConversationId(conversationId);
        session2.setCallerId("bob_call");
        session2.setCalleeId("alice_call");
        session2.setCallType(CallSession.CallType.VIDEO);
        session2.setStatus(CallSession.CallStatus.MISSED);
        session2.setStartedAt(Instant.now().minusSeconds(60));
        callSessionRepository.save(session2);

        mockMvc.perform(get("/api/v1/calls/" + conversationId + "/history")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                // Newest first: session2 (started -60s ago)
                .andExpect(jsonPath("$[0].callType").value("VIDEO"))
                .andExpect(jsonPath("$[0].status").value("MISSED"))
                .andExpect(jsonPath("$[1].callType").value("AUDIO"))
                .andExpect(jsonPath("$[1].status").value("ENDED"));
    }
}
