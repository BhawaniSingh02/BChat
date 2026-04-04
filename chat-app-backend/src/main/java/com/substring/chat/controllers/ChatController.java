package com.substring.chat.controllers;

import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.request.SendMessageRequest;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.TypingEvent;
import com.substring.chat.entities.Message;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.entities.Room;
import com.substring.chat.services.MessageRateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private static final String DM_PREFIX = "dm:";

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final DirectConversationRepository conversationRepository;
    private final MessageRateLimiter rateLimiter;
    private final UserRepository userRepository;

    @MessageMapping("/chat.sendMessage/{roomId}")
    public void sendMessage(@DestinationVariable String roomId,
                            @Payload SendMessageRequest request,
                            Principal principal) {
        if (!rateLimiter.isAllowed(principal.getName())) {
            log.warn("Rate limit exceeded for user: {}", principal.getName());
            return;
        }

        // Membership check — reject silently if the room doesn't exist or user isn't a member
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null || !room.getMembers().contains(principal.getName())) {
            log.warn("User {} attempted to send message to room {} without membership", principal.getName(), roomId);
            messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors",
                    Map.of("error", "You are not a member of this room"));
            return;
        }

        Message message = new Message();
        message.setRoomId(roomId);
        message.setSender(principal.getName());
        message.setSenderName(principal.getName());
        message.setContent(request.getContent());
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : Message.MessageType.TEXT);
        message.setFileUrl(request.getFileUrl());
        message.setTimestamp(Instant.now());
        // Phase 18 — reply and forward
        message.setReplyToId(request.getReplyToId());
        message.setReplyToSnippet(request.getReplyToSnippet());
        message.setReplyToSender(request.getReplyToSender());
        message.setForwardedFrom(request.getForwardedFrom());
        // Phase 21 — apply disappearing timer if set on the conversation (n/a for rooms, handled at DM level)

        Message saved = messageRepository.save(message);
        room.setLastMessageAt(saved.getTimestamp());
        roomRepository.save(room);

        messagingTemplate.convertAndSend("/topic/room/" + roomId, MessageResponse.from(saved));
    }

    @MessageMapping("/chat.addUser/{roomId}")
    public void addUser(@DestinationVariable String roomId, Principal principal) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                MessageResponse.from(buildSystemMessage(roomId, principal.getName() + " joined the room")));
    }

    /**
     * Typing indicator: client sends to /app/chat.typing/{roomId}
     * with payload {"typing": true/false}
     * Broadcasts to /topic/room/{roomId}/typing
     */
    @MessageMapping("/chat.typing/{roomId}")
    public void typing(@DestinationVariable String roomId,
                       @Payload TypingEvent event,
                       Principal principal) {
        TypingEvent broadcast = new TypingEvent(roomId, principal.getName(), event.isTyping());
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", broadcast);
    }

    /**
     * Read receipt: client sends to /app/chat.read/{roomId}
     * with payload {"messageId": "..."}
     * Broadcasts updated message (with readBy) to /topic/room/{roomId}/read
     */
    @MessageMapping("/chat.read/{roomId}")
    public void markRead(@DestinationVariable String roomId,
                         @Payload ReadReceiptRequest request,
                         Principal principal) {
        messageRepository.findById(request.getMessageId()).ifPresent(message -> {
            // Phase 22: record per-user read timestamp
            if (!message.getReadBy().contains(principal.getName())) {
                message.getReadBy().add(principal.getName());
            }
            message.getReadAt().put(principal.getName(), Instant.now());
            messageRepository.save(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/read",
                    MessageResponse.from(message));
        });
    }

    /**
     * Direct message send: client sends to /app/dm.send/{conversationId}
     * Delivers to each participant via /user/queue/messages
     */
    @MessageMapping("/dm.send/{conversationId}")
    public void sendDirectMessage(@DestinationVariable String conversationId,
                                   @Payload SendDirectMessageRequest request,
                                   Principal principal) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (!conv.getParticipants().contains(principal.getName())) return;

            // Block check: silently drop if recipient has blocked the sender
            String recipient = conv.getParticipants().stream()
                    .filter(p -> !p.equals(principal.getName()))
                    .findFirst().orElse(null);
            if (recipient != null) {
                boolean blocked = userRepository.findByUsername(recipient)
                        .map(u -> u.getBlockedUsers() != null && u.getBlockedUsers().contains(principal.getName()))
                        .orElse(false);
                if (blocked) return;
            }

            Message message = new Message();
            message.setRoomId(DM_PREFIX + conversationId);
            message.setSender(principal.getName());
            message.setSenderName(principal.getName());
            message.setContent(request.getContent());
            message.setMessageType(request.getMessageType() != null ? request.getMessageType() : Message.MessageType.TEXT);
            message.setFileUrl(request.getFileUrl());
            message.setTimestamp(Instant.now());
            // Phase 18 — reply and forward
            message.setReplyToId(request.getReplyToId());
            message.setReplyToSnippet(request.getReplyToSnippet());
            message.setReplyToSender(request.getReplyToSender());
            message.setForwardedFrom(request.getForwardedFrom());
            // Phase 21 — apply disappearing timer if set on this conversation
            if (conv.getDisappearingMessagesTimer() != null && !"OFF".equals(conv.getDisappearingMessagesTimer())) {
                message.setDisappearsAt(computeDisappearsAt(conv.getDisappearingMessagesTimer()));
            }

            Message saved = messageRepository.save(message);
            conv.setLastMessageAt(saved.getTimestamp());
            conversationRepository.save(conv);

            MessageResponse response = MessageResponse.from(saved);
            for (String participant : conv.getParticipants()) {
                messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
            }
        });
    }

    private Instant computeDisappearsAt(String timer) {
        return switch (timer) {
            case "24H" -> Instant.now().plusSeconds(24 * 3600);
            case "7D" -> Instant.now().plusSeconds(7 * 24 * 3600);
            case "90D" -> Instant.now().plusSeconds(90L * 24 * 3600);
            default -> null;
        };
    }

    /**
     * Message edit via WebSocket: client sends to /app/chat.editMessage/{roomId}
     * with payload {"messageId": "...", "content": "..."}
     * Broadcasts updated message to /topic/room/{roomId}
     */
    @MessageMapping("/chat.editMessage/{roomId}")
    public void editMessageWs(@DestinationVariable String roomId,
                               @Payload EditMessageWsRequest request,
                               Principal principal) {
        messageRepository.findById(request.getMessageId()).ifPresent(message -> {
            if (!message.getSender().equals(principal.getName())) {
                messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors",
                        Map.of("error", "Cannot edit another user's message"));
                return;
            }
            message.setContent(request.getContent());
            message.setEdited(true);
            message.setEditedAt(Instant.now());
            messageRepository.save(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, MessageResponse.from(message));
        });
    }

    /**
     * Message delete via WebSocket: client sends to /app/chat.deleteMessage/{roomId}
     * with payload {"messageId": "..."}
     * Broadcasts soft-deleted message to /topic/room/{roomId}
     */
    @MessageMapping("/chat.deleteMessage/{roomId}")
    public void deleteMessageWs(@DestinationVariable String roomId,
                                  @Payload DeleteMessageWsRequest request,
                                  Principal principal) {
        messageRepository.findById(request.getMessageId()).ifPresent(message -> {
            if (!message.getSender().equals(principal.getName())) {
                messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors",
                        Map.of("error", "Cannot delete another user's message"));
                return;
            }
            message.setDeleted(true);
            message.setContent("[This message was deleted]");
            messageRepository.save(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, MessageResponse.from(message));
        });
    }

    /**
     * Emoji reaction via WebSocket: client sends to /app/chat.react/{roomId}
     * with payload {"messageId": "...", "emoji": "👍"}
     * Toggles the user's reaction and broadcasts updated message to /topic/room/{roomId}
     */
    @MessageMapping("/chat.react/{roomId}")
    public void reactToMessage(@DestinationVariable String roomId,
                               @Payload ReactMessageWsRequest request,
                               Principal principal) {
        messageRepository.findById(request.getMessageId()).ifPresent(message -> {
            String username = principal.getName();
            Map<String, List<String>> reactions = message.getReactions();
            if (reactions == null) {
                reactions = new HashMap<>();
                message.setReactions(reactions);
            }
            // One reaction per user: find and remove any existing reaction by this user
            String existingEmoji = null;
            for (Map.Entry<String, List<String>> entry : reactions.entrySet()) {
                if (entry.getValue().contains(username)) {
                    existingEmoji = entry.getKey();
                    break;
                }
            }
            if (existingEmoji != null) {
                List<String> existingUsers = reactions.get(existingEmoji);
                existingUsers.remove(username);
                if (existingUsers.isEmpty()) {
                    reactions.remove(existingEmoji);
                }
            }
            // Add to new emoji only if different from existing (same = toggle off, already removed)
            if (!request.getEmoji().equals(existingEmoji)) {
                reactions.computeIfAbsent(request.getEmoji(), k -> new ArrayList<>()).add(username);
            }
            messageRepository.save(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, MessageResponse.from(message));
        });
    }

    /**
     * DM message edit: client sends to /app/dm.edit/{conversationId}
     * with payload {"messageId": "...", "content": "..."}
     * Delivers updated message to all conversation participants via /user/queue/messages
     */
    @MessageMapping("/dm.edit/{conversationId}")
    public void editDMMessage(@DestinationVariable String conversationId,
                               @Payload EditMessageWsRequest request,
                               Principal principal) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (!conv.getParticipants().contains(principal.getName())) return;
            messageRepository.findById(request.getMessageId()).ifPresent(message -> {
                if (!message.getSender().equals(principal.getName())) return;
                if (!(DM_PREFIX + conversationId).equals(message.getRoomId())) return;
                message.setContent(request.getContent());
                message.setEdited(true);
                message.setEditedAt(Instant.now());
                messageRepository.save(message);
                MessageResponse response = MessageResponse.from(message);
                for (String participant : conv.getParticipants()) {
                    messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
                }
            });
        });
    }

    /**
     * DM message delete: client sends to /app/dm.delete/{conversationId}
     * with payload {"messageId": "..."}
     * Delivers soft-deleted message to all conversation participants
     */
    @MessageMapping("/dm.delete/{conversationId}")
    public void deleteDMMessage(@DestinationVariable String conversationId,
                                  @Payload DeleteMessageWsRequest request,
                                  Principal principal) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (!conv.getParticipants().contains(principal.getName())) return;
            messageRepository.findById(request.getMessageId()).ifPresent(message -> {
                if (!message.getSender().equals(principal.getName())) return;
                if (!(DM_PREFIX + conversationId).equals(message.getRoomId())) return;
                message.setDeleted(true);
                message.setContent("[This message was deleted]");
                messageRepository.save(message);
                MessageResponse response = MessageResponse.from(message);
                for (String participant : conv.getParticipants()) {
                    messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
                }
            });
        });
    }

    /**
     * DM emoji reaction: client sends to /app/dm.react/{conversationId}
     * with payload {"messageId": "...", "emoji": "👍"}
     * Toggles the user's reaction and delivers updated message to all participants
     */
    @MessageMapping("/dm.react/{conversationId}")
    public void reactToDMMessage(@DestinationVariable String conversationId,
                                   @Payload ReactMessageWsRequest request,
                                   Principal principal) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (!conv.getParticipants().contains(principal.getName())) return;
            messageRepository.findById(request.getMessageId()).ifPresent(message -> {
                if (!(DM_PREFIX + conversationId).equals(message.getRoomId())) return;
                String username = principal.getName();
                Map<String, List<String>> reactions = message.getReactions();
                if (reactions == null) {
                    reactions = new HashMap<>();
                    message.setReactions(reactions);
                }
                String existingEmoji = null;
                for (Map.Entry<String, List<String>> entry : reactions.entrySet()) {
                    if (entry.getValue().contains(username)) {
                        existingEmoji = entry.getKey();
                        break;
                    }
                }
                if (existingEmoji != null) {
                    List<String> existingUsers = reactions.get(existingEmoji);
                    existingUsers.remove(username);
                    if (existingUsers.isEmpty()) {
                        reactions.remove(existingEmoji);
                    }
                }
                if (!request.getEmoji().equals(existingEmoji)) {
                    reactions.computeIfAbsent(request.getEmoji(), k -> new ArrayList<>()).add(username);
                }
                messageRepository.save(message);
                MessageResponse response = MessageResponse.from(message);
                for (String participant : conv.getParticipants()) {
                    messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
                }
            });
        });
    }

    private Message buildSystemMessage(String roomId, String content) {
        Message msg = new Message();
        msg.setRoomId(roomId);
        msg.setSender("SYSTEM");
        msg.setSenderName("System");
        msg.setContent(content);
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(Instant.now());
        return msg;
    }

    @lombok.Getter
    @lombok.Setter
    public static class ReadReceiptRequest {
        private String messageId;
    }

    @lombok.Getter
    @lombok.Setter
    public static class EditMessageWsRequest {
        private String messageId;
        private String content;
    }

    @lombok.Getter
    @lombok.Setter
    public static class DeleteMessageWsRequest {
        private String messageId;
    }

    @lombok.Getter
    @lombok.Setter
    public static class ReactMessageWsRequest {
        private String messageId;
        private String emoji;
    }
}
