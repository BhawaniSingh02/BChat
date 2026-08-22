package com.substring.chat.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.dto.request.RegisterRequest;
import com.substring.chat.dto.request.VerifyEmailOtpRequest;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.StoryRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StoryControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private DirectConversationRepository conversationRepository;
    @Autowired private StoryRepository storyRepository;

    private String aliceToken;
    private String bobToken;
    private String aliceHandle;
    private String bobHandle;

    @BeforeEach
    void setUp() throws Exception {
        storyRepository.deleteAll();
        conversationRepository.deleteAll();
        userRepository.deleteAll();

        aliceToken = registerAndGetToken("Alice Story", "alice_story@example.com", "password123");
        bobToken = registerAndGetToken("Bob Story", "bob_story@example.com", "password123");
        aliceHandle = userRepository.findByEmail("alice_story@example.com").orElseThrow().getUsername();
        bobHandle = userRepository.findByEmail("bob_story@example.com").orElseThrow().getUsername();

        // alice and bob share an accepted DM so they see each other's stories
        DirectConversation conv = new DirectConversation();
        conv.setParticipants(List.of(aliceHandle, bobHandle));
        conv.setStatus("ACCEPTED");
        conv.setCreatedAt(Instant.now());
        conversationRepository.save(conv);
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

        User user = userRepository.findByEmail(email).orElseThrow();
        VerifyEmailOtpRequest verify = new VerifyEmailOtpRequest();
        verify.setEmail(email);
        verify.setCode(user.getEmailVerificationToken());
        String body = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("token").asText();

        String handle = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._]", "");
        mockMvc.perform(post("/api/v1/users/me/handle")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"handle\":\"" + handle + "\"}"))
                .andExpect(status().isOk());
        return token;
    }

    private String createTextStory(String token, String content) throws Exception {
        String body = mockMvc.perform(post("/api/v1/stories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"TEXT\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asText();
    }

    @Test
    void createStory_requiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/stories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"TEXT\",\"content\":\"hi\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void feed_includesOwnAndContactStories() throws Exception {
        createTextStory(aliceToken, "alice story");
        createTextStory(bobToken, "bob story");

        // alice sees both her own group and bob's group
        mockMvc.perform(get("/api/v1/stories/feed")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].authorId").value(aliceHandle)); // own group first
    }

    @Test
    void viewing_marksStoryAndShowsInViewers() throws Exception {
        String storyId = createTextStory(bobToken, "bob story");

        mockMvc.perform(post("/api/v1/stories/" + storyId + "/view")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNoContent());

        // author can see who viewed
        mockMvc.perform(get("/api/v1/stories/" + storyId + "/viewers")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewers", hasSize(1)))
                .andExpect(jsonPath("$.viewers[0]").value(aliceHandle));
    }

    @Test
    void viewers_forbiddenForNonAuthor() throws Exception {
        String storyId = createTextStory(bobToken, "bob story");
        mockMvc.perform(get("/api/v1/stories/" + storyId + "/viewers")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void reply_sendsDmToAuthor() throws Exception {
        String storyId = createTextStory(bobToken, "good morning");

        mockMvc.perform(post("/api/v1/stories/" + storyId + "/reply")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"love this!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("love this!"))
                .andExpect(jsonPath("$.sender").value(aliceHandle));
    }

    @Test
    void reply_rejectsReplyingToOwnStory() throws Exception {
        String storyId = createTextStory(aliceToken, "my story");

        mockMvc.perform(post("/api/v1/stories/" + storyId + "/reply")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"hi\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void react_addsReactionAndTogglesOffOnSecondTap() throws Exception {
        String storyId = createTextStory(bobToken, "good morning");

        mockMvc.perform(post("/api/v1/stories/" + storyId + "/react")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"😮\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reactions['😮']").value(1))
                .andExpect(jsonPath("$.myReaction").value("😮"));

        // tapping the same emoji again removes it
        mockMvc.perform(post("/api/v1/stories/" + storyId + "/react")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"😮\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myReaction").doesNotExist());
    }

    @Test
    void react_rejectsReactingToOwnStory() throws Exception {
        String storyId = createTextStory(aliceToken, "my story");

        mockMvc.perform(post("/api/v1/stories/" + storyId + "/react")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"😮\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createStory_acceptsVideoType() throws Exception {
        mockMvc.perform(post("/api/v1/stories")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"VIDEO\",\"mediaUrl\":\"https://cdn.example.com/clip.mp4\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("VIDEO"));
    }

    @Test
    void deleteStory_removesOwnStory() throws Exception {
        String storyId = createTextStory(aliceToken, "alice story");
        mockMvc.perform(delete("/api/v1/stories/" + storyId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/stories/feed")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void deleteStory_forbiddenForNonAuthor() throws Exception {
        String storyId = createTextStory(bobToken, "bob story");
        mockMvc.perform(delete("/api/v1/stories/" + storyId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());
    }
}
