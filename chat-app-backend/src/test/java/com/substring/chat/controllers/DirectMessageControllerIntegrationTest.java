package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.SendDirectMessageRequest;
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

    @BeforeEach
    void setUp() throws Exception {
        messageRepository.deleteAll();
        conversationRepository.deleteAll();
        userRepository.deleteAll();

        aliceToken = registerAndGetToken("alice", "alice@example.com", "password123");
        bobToken = registerAndGetToken("bob", "bob@example.com", "password123");
    }

    private String registerAndGetToken(String username, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);

        String response = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("token").asText();
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
        String response = mockMvc.perform(post("/api/v1/dm/bob")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.participants").isArray())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void getOrCreateConversation_returnsExistingOnSecondCall() throws Exception {
        String firstResponse = mockMvc.perform(post("/api/v1/dm/bob")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String firstId = objectMapper.readTree(firstResponse).get("id").asText();

        String secondResponse = mockMvc.perform(post("/api/v1/dm/bob")
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
        String convResponse = mockMvc.perform(post("/api/v1/dm/bob")
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
                .andExpect(jsonPath("$.sender").value("alice"))
                .andExpect(jsonPath("$.roomId").value("dm:" + conversationId));
    }

    @Test
    void sendMessage_returns400WithEmptyContent() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/bob")
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
        String convResponse = mockMvc.perform(post("/api/v1/dm/bob")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String conversationId = objectMapper.readTree(convResponse).get("id").asText();

        mockMvc.perform(get("/api/v1/dm/" + conversationId + "/messages")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void getMessages_returnsMessageAfterSend() throws Exception {
        String convResponse = mockMvc.perform(post("/api/v1/dm/bob")
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
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].content").value("Test message"));
    }

    @Test
    void getMessages_returns404ForNonParticipant() throws Exception {
        // Create a third user
        String charlieToken = registerAndGetToken("charlie", "charlie@example.com", "pass123");

        String convResponse = mockMvc.perform(post("/api/v1/dm/bob")
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
        mockMvc.perform(post("/api/v1/dm/bob")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/dm")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
