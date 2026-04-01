package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.CreateRoomRequest;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.entities.Message;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoomControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private MessageRepository messageRepository;

    private String authToken;
    private String secondUserToken;

    @BeforeEach
    void setUp() throws Exception {
        messageRepository.deleteAll();
        roomRepository.deleteAll();
        userRepository.deleteAll();

        authToken = registerAndGetToken("roomuser", "roomuser@example.com", "password123");
        secondUserToken = registerAndGetToken("roomuser2", "roomuser2@example.com", "password123");
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
    void createRoom_returns201WithRoomData() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("tech-talk");
        request.setName("Tech Talk");
        request.setDescription("Technology discussions");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomId").value("tech-talk"))
                .andExpect(jsonPath("$.name").value("Tech Talk"))
                .andExpect(jsonPath("$.createdBy").value("roomuser"))
                .andExpect(jsonPath("$.memberCount").value(1));
    }

    @Test
    void createRoom_returns401WithoutToken() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("no-auth-room");
        request.setName("No Auth Room");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRoom_returns409WhenRoomIdTaken() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("duplicate-room");
        request.setName("Duplicate Room");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void getRoom_returnsRoomWhenExists() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("get-room-test");
        request.setName("Get Room Test");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/rooms/get-room-test")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").value("get-room-test"));
    }

    @Test
    void getRoom_returns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/nonexistent-room")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void joinRoom_addsSecondUserToRoom() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("join-test-room");
        request.setName("Join Test");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/rooms/join-test-room/join")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(2));
    }

    @Test
    void leaveRoom_removesUser() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("leave-test-room");
        request.setName("Leave Test");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/rooms/leave-test-room/join")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/rooms/leave-test-room/leave")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void getMessages_returnsEmptyPageWhenNoMessages() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("empty-room");
        request.setName("Empty Room");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/rooms/empty-room/messages")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void createRoom_returns400WithInvalidRoomId() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("ab"); // too short
        request.setName("Short ID Room");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAllRooms_returnsListOfRooms() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("list-test-room");
        request.setName("List Test");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/rooms")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getMyRooms_returnsOnlyRoomsUserBelongsTo() throws Exception {
        // Create room as first user
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("my-room-1");
        request.setName("My Room 1");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Create another room as second user
        CreateRoomRequest request2 = new CreateRoomRequest();
        request2.setRoomId("other-room-1");
        request2.setName("Other Room 1");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + secondUserToken)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isCreated());

        // First user should only see their own room
        mockMvc.perform(get("/api/v1/rooms/me")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].roomId").value("my-room-1"));
    }

    @Test
    void searchMessages_returnsMatchingMessages() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("search-room");
        request.setName("Search Room");

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/rooms/search-room/messages/search")
                        .param("q", "hello")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void searchMessages_returns404WhenRoomNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/nonexistent/messages/search")
                        .param("q", "hello")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isNotFound());
    }

    // ── Message edit / delete ─────────────────────────────────────────────────

    private String createRoomAndSeedMessage(String roomId, String ownerToken, String ownerUsername) throws Exception {
        CreateRoomRequest req = new CreateRoomRequest();
        req.setRoomId(roomId);
        req.setName("Room " + roomId);

        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + ownerToken)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Seed a message directly via repository
        Message msg = new Message();
        msg.setRoomId(roomId);
        msg.setSender(ownerUsername);
        msg.setSenderName(ownerUsername);
        msg.setContent("Original content");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(java.time.Instant.now());
        msg.setReadBy(new java.util.ArrayList<>());
        return messageRepository.save(msg).getId();
    }

    @Test
    void editMessage_returns200WithUpdatedContent() throws Exception {
        String messageId = createRoomAndSeedMessage("edit-room-1", authToken, "roomuser");

        mockMvc.perform(put("/api/v1/rooms/edit-room-1/messages/" + messageId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content("{\"content\":\"Edited content\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Edited content"))
                .andExpect(jsonPath("$.edited").value(true));
    }

    @Test
    void editMessage_returns403WhenNotOwner() throws Exception {
        String messageId = createRoomAndSeedMessage("edit-room-2", authToken, "roomuser");

        // Join room as second user then try to edit first user's message
        mockMvc.perform(post("/api/v1/rooms/edit-room-2/join")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/rooms/edit-room-2/messages/" + messageId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + secondUserToken)
                        .content("{\"content\":\"Hacked content\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void editMessage_returns404WhenMessageNotFound() throws Exception {
        CreateRoomRequest req = new CreateRoomRequest();
        req.setRoomId("edit-room-3");
        req.setName("Edit Room 3");
        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/v1/rooms/edit-room-3/messages/nonexistent-msg-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content("{\"content\":\"New content\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteMessage_returns200WithDeletedFlagAndPlaceholder() throws Exception {
        String messageId = createRoomAndSeedMessage("delete-room-1", authToken, "roomuser");

        mockMvc.perform(delete("/api/v1/rooms/delete-room-1/messages/" + messageId)
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true))
                .andExpect(jsonPath("$.content").value("[This message was deleted]"));
    }

    @Test
    void deleteMessage_returns403WhenNotOwner() throws Exception {
        String messageId = createRoomAndSeedMessage("delete-room-2", authToken, "roomuser");

        mockMvc.perform(post("/api/v1/rooms/delete-room-2/join")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/rooms/delete-room-2/messages/" + messageId)
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void editMessage_returns400WithBlankContent() throws Exception {
        String messageId = createRoomAndSeedMessage("edit-room-4", authToken, "roomuser");

        mockMvc.perform(put("/api/v1/rooms/edit-room-4/messages/" + messageId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content("{\"content\":\"\"}"))
                .andExpect(status().isBadRequest());
    }
}
