package com.substring.chat.services;

import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.exceptions.MessageNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final String DM_PREFIX = "dm:";

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final DirectConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Phase 19: Star / Unstar ──────────────────────────────────────────

    /**
     * Toggle star on a message. Returns the updated MessageResponse.
     * Any participant/member who can read the message can star it.
     */
    public MessageResponse toggleStar(String messageId, String username) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));

        List<String> starred = message.getStarred();
        if (starred.contains(username)) {
            starred.remove(username);
        } else {
            starred.add(username);
        }
        messageRepository.save(message);
        return MessageResponse.from(message);
    }

    /**
     * Get all messages starred by the given user across all rooms and DMs.
     */
    public List<MessageResponse> getStarredMessages(String username) {
        return messageRepository.findByStarredContaining(username)
                .stream()
                .filter(m -> !m.isDeleted())
                .map(MessageResponse::from)
                .toList();
    }

    // ── Phase 18: Forward message ────────────────────────────────────────

    /**
     * Forward a message to a room. The forwarded message gets the current user as sender
     * and retains the original sender in forwardedFrom.
     */
    public MessageResponse forwardToRoom(String messageId, String targetRoomId, String username) {
        Message original = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));

        Room room = roomRepository.findByRoomId(targetRoomId);
        if (room == null || !room.getMembers().contains(username)) {
            throw new IllegalArgumentException("Room not found or user not a member");
        }

        Message forwarded = buildForwardedMessage(original, username);
        forwarded.setRoomId(targetRoomId);

        Message saved = messageRepository.save(forwarded);
        room.setLastMessageAt(saved.getTimestamp());
        roomRepository.save(room);

        MessageResponse response = MessageResponse.from(saved);
        messagingTemplate.convertAndSend("/topic/room/" + targetRoomId, response);
        return response;
    }

    /**
     * Forward a message to a DM conversation.
     */
    public MessageResponse forwardToDM(String messageId, String conversationId, String username) {
        Message original = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));

        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        if (!conv.getParticipants().contains(username)) {
            throw new IllegalArgumentException("User is not a participant");
        }

        Message forwarded = buildForwardedMessage(original, username);
        forwarded.setRoomId(DM_PREFIX + conversationId);

        Message saved = messageRepository.save(forwarded);
        conv.setLastMessageAt(saved.getTimestamp());
        conversationRepository.save(conv);

        MessageResponse response = MessageResponse.from(saved);
        for (String participant : conv.getParticipants()) {
            messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
        }
        return response;
    }

    private Message buildForwardedMessage(Message original, String forwarder) {
        Message msg = new Message();
        msg.setSender(forwarder);
        msg.setSenderName(forwarder);
        msg.setContent(original.getContent());
        msg.setMessageType(original.getMessageType());
        msg.setFileUrl(original.getFileUrl());
        msg.setForwardedFrom(original.getForwardedFrom() != null
                ? original.getForwardedFrom()   // preserve original origin on re-forward
                : original.getSender());
        msg.setTimestamp(Instant.now());
        return msg;
    }

    // ── Phase 22: Read receipt details ──────────────────────────────────

    /**
     * Mark a message as read by the given user, recording the exact timestamp.
     * Returns the updated message (broadcast handled by caller).
     */
    public Message markReadWithTimestamp(String messageId, String username) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));

        if (!message.getReadBy().contains(username)) {
            message.getReadBy().add(username);
        }
        message.getReadAt().put(username, Instant.now());
        return messageRepository.save(message);
    }

    /**
     * Get per-user read receipt details for a message (username → read timestamp).
     */
    public Map<String, Instant> getReadReceipts(String messageId, String requestingUser) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));

        // Only sender or room members should call this — callers enforce access control
        return message.getReadAt();
    }

    // ── Phase 21: Disappearing messages scheduled cleanup ───────────────

    /**
     * Runs every minute. Soft-deletes all messages whose disappearsAt has passed.
     */
    @Scheduled(fixedDelay = 60_000)
    public void purgeExpiredMessages() {
        List<Message> expired = messageRepository.findByDisappearsAtBeforeAndDeletedFalse(Instant.now());
        for (Message msg : expired) {
            msg.setDeleted(true);
            msg.setContent("[This message has disappeared]");
            messageRepository.save(msg);

            // Broadcast deletion via WebSocket
            String roomId = msg.getRoomId();
            if (roomId.startsWith(DM_PREFIX)) {
                String conversationId = roomId.substring(DM_PREFIX.length());
                conversationRepository.findById(conversationId).ifPresent(conv -> {
                    MessageResponse response = MessageResponse.from(msg);
                    for (String participant : conv.getParticipants()) {
                        messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
                    }
                });
            } else {
                messagingTemplate.convertAndSend("/topic/room/" + roomId, MessageResponse.from(msg));
            }
        }
    }
}
