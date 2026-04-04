package com.substring.chat.services;

import com.substring.chat.dto.request.SendDirectMessageRequest;
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

    public DirectConversationResponse getOrCreateConversation(String currentUser, String otherUser) {
        if (!userRepository.existsByUsername(otherUser)) {
            throw new UserNotFoundException(otherUser);
        }

        return conversationRepository.findByBothParticipants(currentUser, otherUser)
                .map(DirectConversationResponse::from)
                .orElseGet(() -> {
                    DirectConversation conv = new DirectConversation();
                    List<String> participants = new ArrayList<>();
                    participants.add(currentUser);
                    participants.add(otherUser);
                    conv.setParticipants(participants);
                    conv.setCreatedAt(Instant.now());
                    return DirectConversationResponse.from(conversationRepository.save(conv));
                });
    }

    public List<DirectConversationResponse> getConversationsForUser(String username) {
        return conversationRepository.findByParticipantsContaining(username)
                .stream()
                .map(DirectConversationResponse::from)
                .toList();
    }

    public Page<MessageResponse> getMessages(String conversationId, String requestingUser, int page, int size) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        if (!conv.getParticipants().contains(requestingUser)) {
            throw new ConversationNotFoundException(conversationId);
        }

        return messageRepository.findByRoomIdOrderByTimestampDesc(
                "dm:" + conversationId, PageRequest.of(page, size))
                .map(MessageResponse::from);
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

        Message saved = messageRepository.save(message);

        conv.setLastMessageAt(saved.getTimestamp());
        conversationRepository.save(conv);

        return MessageResponse.from(saved);
    }
}
