package com.substring.chat.services;

import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.response.CursorPage;
import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class DirectMessageService {

    private final DirectConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public DirectConversationResponse getOrCreateConversation(String currentUser, String otherIdentifier) {
        // Accept either the stable (opaque) username or the public @handle, and always
        // store the stable username as the participant so it survives handle changes.
        User other = userRepository.findByUsername(otherIdentifier)
                .or(() -> userRepository.findByUniqueHandleIgnoreCase(otherIdentifier))
                .orElseThrow(() -> new UserNotFoundException(otherIdentifier));
        String otherUser = other.getUsername();

        var existing = conversationRepository.findByBothParticipants(currentUser, otherUser);
        if (existing.isPresent()) {
            return DirectConversationResponse.from(existing.get());
        }

        // New conversation — decide whether it's an accepted chat or a pending request,
        // based on the recipient's privacy setting (whoCanMessage).
        String whoCanMessage = other.getWhoCanMessage() != null ? other.getWhoCanMessage() : "APPROVED_ONLY";
        boolean self = currentUser.equals(otherUser);
        if ("NOBODY".equals(whoCanMessage) && !self) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This user isn't accepting new messages");
        }
        boolean autoAccept = self || "ANYONE".equals(whoCanMessage);

        DirectConversation conv = new DirectConversation();
        List<String> participants = new ArrayList<>();
        participants.add(currentUser);
        participants.add(otherUser);
        conv.setParticipants(participants);
        conv.setCreatedAt(Instant.now());
        if (autoAccept) {
            conv.setStatus("ACCEPTED");
        } else {
            conv.setStatus("PENDING");
            conv.setInitiatedBy(currentUser);
        }
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    /** Main inbox — excludes message requests addressed TO this user (those go to the Requests inbox). */
    public List<DirectConversationResponse> getConversationsForUser(String username) {
        return conversationRepository.findByParticipantsContaining(username)
                .stream()
                .filter(c -> !isIncomingRequest(c, username))
                .map(DirectConversationResponse::from)
                .toList();
    }

    /** Unread message counts per conversation the user is in. Deliberately uncached — always fresh. */
    public java.util.Map<String, Long> getUnreadCounts(String username) {
        List<DirectConversation> conversations = conversationRepository.findByParticipantsContaining(username);
        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        for (DirectConversation conv : conversations) {
            long count = messageRepository.countByRoomIdAndSenderNotAndReadByNotContaining(
                    "dm:" + conv.getId(), username, username);
            if (count > 0) counts.put(conv.getId(), count);
        }
        return counts;
    }

    /** Pending message requests addressed to this user (from people they haven't accepted). */
    public List<DirectConversationResponse> getRequestsForUser(String username) {
        return conversationRepository.findByParticipantsContaining(username)
                .stream()
                .filter(c -> isIncomingRequest(c, username))
                .map(DirectConversationResponse::from)
                .toList();
    }

    /** Accept a message request — promotes it to a normal conversation. */
    public DirectConversationResponse acceptRequest(String conversationId, String username) {
        DirectConversation conv = requireIncomingRequest(conversationId, username);
        conv.setStatus("ACCEPTED");
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    /** Decline a message request — removes the conversation and its messages. */
    public void declineRequest(String conversationId, String username) {
        DirectConversation conv = requireIncomingRequest(conversationId, username);
        messageRepository.deleteByRoomId("dm:" + conversationId);
        conversationRepository.delete(conv);
    }

    private boolean isIncomingRequest(DirectConversation c, String username) {
        return "PENDING".equals(c.getStatus())
                && c.getInitiatedBy() != null
                && !username.equals(c.getInitiatedBy())
                && c.getParticipants().contains(username);
    }

    private DirectConversation requireIncomingRequest(String conversationId, String username) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
        if (!isIncomingRequest(conv, username)) {
            // Not a pending request addressed to this user — don't reveal details.
            throw new ConversationNotFoundException(conversationId);
        }
        return conv;
    }

    public CursorPage<MessageResponse> getMessages(String conversationId, String requestingUser, Long before, int size) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        if (!conv.getParticipants().contains(requestingUser)) {
            throw new ConversationNotFoundException(conversationId);
        }

        Instant cursor = before != null ? Instant.ofEpochMilli(before) : Instant.now();
        Page<Message> page = messageRepository.findByRoomIdAndTimestampBeforeOrderByTimestampDesc(
                "dm:" + conversationId, cursor, PageRequest.of(0, size));
        List<MessageResponse> content = page.getContent().stream().map(MessageResponse::from).toList();
        Long nextCursor = content.isEmpty() ? null
                : page.getContent().get(page.getContent().size() - 1).getTimestamp().toEpochMilli();
        return new CursorPage<>(content, nextCursor, page.hasNext());
    }

    public MessageResponse sendMessage(String conversationId, String senderUsername,
                                       SendDirectMessageRequest request) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        if (!conv.getParticipants().contains(senderUsername)) {
            throw new ConversationNotFoundException(conversationId);
        }

        // Block check: refuse if the recipient has blocked the sender
        String recipient = conv.getParticipants().stream()
                .filter(p -> !p.equals(senderUsername))
                .findFirst().orElse(null);
        if (recipient != null) {
            User recipientUser = userRepository.findByUsername(recipient).orElse(null);
            if (recipientUser != null
                    && recipientUser.getBlockedUsers() != null
                    && recipientUser.getBlockedUsers().contains(senderUsername)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot send messages to this user");
            }
        }

        Message message = new Message();
        message.setRoomId("dm:" + conversationId);
        message.setSender(senderUsername);
        message.setSenderName(senderUsername);
        message.setContent(request.getContent());
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : Message.MessageType.TEXT);
        message.setFileUrl(request.getFileUrl());
        message.setTimestamp(Instant.now());
        // Phase 18 — reply and forward
        message.setReplyToId(request.getReplyToId());
        message.setReplyToSnippet(request.getReplyToSnippet());
        message.setReplyToSender(request.getReplyToSender());
        message.setForwardedFrom(request.getForwardedFrom());
        message.setStoryReactionEmoji(request.getStoryReactionEmoji());

        Message saved = messageRepository.save(message);

        // Replying to a pending request accepts it.
        if ("PENDING".equals(conv.getStatus()) && conv.getInitiatedBy() != null
                && !senderUsername.equals(conv.getInitiatedBy())) {
            conv.setStatus("ACCEPTED");
        }
        applyLastMessage(conv, saved);
        conversationRepository.save(conv);

        return MessageResponse.from(saved);
    }

    /** Denormalize the latest message onto the conversation for fast inbox previews. */
    public static void applyLastMessage(DirectConversation conv, Message message) {
        conv.setLastMessageAt(message.getTimestamp());
        conv.setLastMessagePreview(previewTextFor(message));
        conv.setLastMessageType(message.getMessageType() != null ? message.getMessageType().name() : "TEXT");
        conv.setLastMessageSender(message.getSender());
    }

    /** Short, list-friendly preview: the text, or a media label for non-text messages. */
    public static String previewTextFor(Message message) {
        String content = message.getContent();
        if (content != null && !content.isBlank()) {
            return content.length() > 120 ? content.substring(0, 120) : content;
        }
        Message.MessageType type = message.getMessageType();
        if (type == null) return "";
        return switch (type) {
            case IMAGE -> "📷 Photo";
            case FILE -> "📎 File";
            case AUDIO -> "🎤 Voice message";
            case VIDEO -> "🎬 Video";
            default -> "";
        };
    }
}
