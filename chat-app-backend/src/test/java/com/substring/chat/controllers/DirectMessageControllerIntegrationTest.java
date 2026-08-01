package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.User;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DirectMessageControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DirectConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    private String aliceToken;
    private String bobToken;
    private String aliceHandle;
    private String bobHandle;
    private String aliceUserName; // opaque principal — used as map keys (mutedBy) etc.

    @BeforeEach
    void setUp() throws Exception {
        messageRepository.deleteAll();
        conversationRepository.deleteAll();
        userRepository.deleteAll();

        aliceToken = registerAndGetToken("Alice Test", "alice@example.com", "password123");
        bobToken = registerAndGetToken("Bob Test", "bob@example.com", "password123");

        User alice = userRepository.findByEmail("alice@example.com").orElseThrow();
        aliceHandle = alice.getUniqueHandle();
        aliceUserName = alice.getUsername();
        bobHandle = userRepository.findByEmail("bob@example.com").orElseThrow().getUniqueHandle();
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

        String response = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(response).get("token").asText();
        // New flow: claim a public @handle after verification.
        String handle = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._]", "");
        if (handle.length() < 3) handle = handle + "user";
        mockMvc.perform(post("/api/v1/users/me/handle")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"handle\":\"" + handle + "\"}"))
                .andExpect(status().isOk());
        return token;
    }

    @Test
    void getMyConversations_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/dm"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyConversations_returnsEmptyListInitially() throws Exception {
        mockMvc.perform(get("/api/v1/dm")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getOrCreateConversation_createsNewConversation() throws Exception {
        mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.participants").isArray());
    }

    @Test
    void getOrCreateConversation_returnsExistingOnSecondCall() throws Exception {
        String firstResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String firstId = objectMapper.readTree(firstResponse).get("id").asText();

        String secondResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String secondId = objectMapper.readTree(secondResponse).get("id").asText();

        assert firstId.equals(secondId) : "Should return the same conversation ID";
    }

    @Test
    void getOrCreateConversation_returns404WhenOtherUserNotFound() throws Exception {
        mockMvc.perform(post("/api/v1/dm/nonexistentuser")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void sendMessage_persistsMessage() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        SendDirectMessageRequest messageRequest = new SendDirectMessageRequest();
        messageRequest.setContent("Hello Bob!");

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Hello Bob!"))
                .andExpect(jsonPath("$.sender").value(aliceUserName))
                .andExpect(jsonPath("$.roomId").value("dm:" + conversationId));
    }

    @Test
    void sendMessage_returns400WithEmptyContent() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        SendDirectMessageRequest messageRequest = new SendDirectMessageRequest();
        messageRequest.setContent("");

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messageRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMessages_returnsEmptyInitially() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(get("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void getMessages_returnsMessageAfterSend() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        SendDirectMessageRequest messageRequest = new SendDirectMessageRequest();
        messageRequest.setContent("Test message");

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messageRequest)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].content").value("Test message"));
    }

    @Test
    void getMessages_returns404ForNonParticipant() throws Exception {
        String charlieToken = registerAndGetToken("Charlie Test", "charlie@example.com", "pass123");

        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(get("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + charlieToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getMyConversations_returnsConversationAfterCreation() throws Exception {
        mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/dm")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void muteConversation_persistsAndRoundTrips() throws Exception {
        // mutedBy is a Map keyed by the (opaque) username. The dot-replacement config
        // keeps it safe even for legacy dotted usernames; here we verify mute persists.
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/mute")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"duration\":\"ALWAYS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mutedBy['" + aliceUserName + "']").exists());

        // And it must round-trip from the database (read back the persisted map key).
        var persisted = conversationRepository.findById(conversationId).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(persisted.getMutedBy()).containsKey(aliceUserName);
    }

    @Test
    void messageRequest_pendingForRecipient_thenAcceptPromotesToInbox() throws Exception {
        // Bob defaults to APPROVED_ONLY, so Alice's first DM becomes a pending request.
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        // Bob: not in main inbox, but present in Requests.
        mockMvc.perform(get("/api/v1/dm").header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/v1/dm/requests").header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$.length()").value(1));

        // Alice (the initiator): the sent request stays in her main inbox.
        mockMvc.perform(get("/api/v1/dm").header("Authorization", "Bearer " + aliceToken))
                .andExpect(jsonPath("$.length()").value(1));

        // Bob accepts → it becomes a normal conversation.
        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/accept")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(get("/api/v1/dm").header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/v1/dm/requests").header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void messageRequest_declineRemovesIt() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/decline")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/dm/requests").header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$.length()").value(0));
        // Declining the only request also removed the conversation for the initiator.
        mockMvc.perform(get("/api/v1/dm").header("Authorization", "Bearer " + aliceToken))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unmuteConversation_removesTheUser() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/" + bobHandle)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(post("/api/v1/dm/" + conversationId + "/mute")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"duration\":\"8H\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/dm/" + conversationId + "/mute")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mutedBy['" + aliceUserName + "']").doesNotExist());
    }
}
