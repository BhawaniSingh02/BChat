package com.substring.chat.services;

import com.substring.chat.dto.request.CreateRoomRequest;
import com.substring.chat.dto.request.UpdateRoomRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.RoomResponse;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.exceptions.MessageNotFoundException;
import com.substring.chat.exceptions.RoomAlreadyExistsException;
import com.substring.chat.exceptions.RoomNotFoundException;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public RoomResponse createRoom(CreateRoomRequest request, String createdBy) {
        if (roomRepository.findByRoomId(request.getRoomId()) != null) {
            throw new RoomAlreadyExistsException(request.getRoomId());
        }

        Room room = new Room();
        room.setRoomId(request.getRoomId());
        room.setName(request.getName());
        room.setDescription(request.getDescription());
        room.setCreatedBy(createdBy);
        room.setMembers(new ArrayList<>());
        room.getMembers().add(createdBy);
        room.setCreatedAt(Instant.now());

        Room saved = roomRepository.save(room);
        return RoomResponse.from(saved);
    }

    public RoomResponse getRoom(String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        return RoomResponse.from(room);
    }

    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAllByOrderByLastMessageAtDesc()
                .stream()
                .map(RoomResponse::from)
                .toList();
    }

    public List<RoomResponse> getRoomsForUser(String username) {
        return roomRepository.findByMembersContaining(username)
                .stream()
                .map(RoomResponse::from)
                .toList();
    }

    public RoomResponse joinRoom(String roomId, String username) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        if (!room.getMembers().contains(username)) {
            room.getMembers().add(username);
            roomRepository.save(room);
        }
        return RoomResponse.from(room);
    }

    public void leaveRoom(String roomId, String username) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        room.getMembers().remove(username);
        roomRepository.save(room);
    }

    public Page<MessageResponse> getMessages(String roomId, int page, int size) {
        if (roomRepository.findByRoomId(roomId) == null) {
            throw new RoomNotFoundException(roomId);
        }
        return messageRepository.findByRoomIdOrderByTimestampDesc(
                roomId, PageRequest.of(page, size))
                .map(MessageResponse::from);
    }

    public List<MessageResponse> searchMessages(String roomId, String query) {
        if (roomRepository.findByRoomId(roomId) == null) {
            throw new RoomNotFoundException(roomId);
        }
        return messageRepository.findByRoomIdAndContentContainingIgnoreCaseOrderByTimestampDesc(roomId, query)
                .stream()
                .map(MessageResponse::from)
                .toList();
    }

    public MessageResponse markMessageRead(String roomId, String messageId, String username) {
        if (roomRepository.findByRoomId(roomId) == null) {
            throw new RoomNotFoundException(roomId);
        }
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        if (!message.getReadBy().contains(username)) {
            message.getReadBy().add(username);
            messageRepository.save(message);
        }
        return MessageResponse.from(message);
    }

    public MessageResponse editMessage(String roomId, String messageId, String content, String requestingUsername) {
        if (roomRepository.findByRoomId(roomId) == null) {
            throw new RoomNotFoundException(roomId);
        }
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        if (!message.getSender().equals(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Cannot edit another user's message");
        }
        message.setContent(content);
        message.setEdited(true);
        message.setEditedAt(Instant.now());
        messageRepository.save(message);
        return MessageResponse.from(message);
    }

    public MessageResponse deleteMessage(String roomId, String messageId, String requestingUsername) {
        if (roomRepository.findByRoomId(roomId) == null) {
            throw new RoomNotFoundException(roomId);
        }
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        if (!message.getSender().equals(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Cannot delete another user's message");
        }
        message.setDeleted(true);
        message.setContent("[This message was deleted]");
        messageRepository.save(message);
        return MessageResponse.from(message);
    }

    /** Kick a member — only the room creator (admin) can do this. Admin cannot kick themselves. */
    public RoomResponse kickMember(String roomId, String targetUsername, String requestingUsername) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) throw new RoomNotFoundException(roomId);
        if (!room.getCreatedBy().equals(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the room admin can kick members");
        }
        if (targetUsername.equals(requestingUsername)) {
            throw new IllegalArgumentException("Admin cannot kick themselves");
        }
        room.getMembers().remove(targetUsername);
        roomRepository.save(room);
        return RoomResponse.from(room);
    }

    /** Update room name/description — admin only. */
    public RoomResponse updateRoom(String roomId, UpdateRoomRequest request, String requestingUsername) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) throw new RoomNotFoundException(roomId);
        if (!room.getCreatedBy().equals(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the room admin can update room details");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            room.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            room.setDescription(request.getDescription().isBlank() ? null : request.getDescription().trim());
        }
        roomRepository.save(room);
        return RoomResponse.from(room);
    }

    /** Pin a message — max 3 pinned messages per room. Any member can pin. */
    public RoomResponse pinMessage(String roomId, String messageId, String requestingUsername) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) throw new RoomNotFoundException(roomId);
        if (!room.getMembers().contains(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Must be a member to pin messages");
        }
        // Validate the message actually belongs to this room
        messageRepository.findById(messageId).ifPresent(msg -> {
            if (!roomId.equals(msg.getRoomId())) {
                throw new IllegalArgumentException("Message does not belong to room: " + roomId);
            }
        });
        if (room.getPinnedMessages() == null) room.setPinnedMessages(new ArrayList<>());
        if (!room.getPinnedMessages().contains(messageId)) {
            if (room.getPinnedMessages().size() >= 3) {
                throw new IllegalStateException("Maximum 3 messages can be pinned per room");
            }
            room.getPinnedMessages().add(messageId);
            roomRepository.save(room);
        }
        return RoomResponse.from(room);
    }

    /** Unpin a message — admin or the pinner. For simplicity, any member can unpin. */
    public RoomResponse unpinMessage(String roomId, String messageId, String requestingUsername) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) throw new RoomNotFoundException(roomId);
        if (!room.getMembers().contains(requestingUsername)) {
            throw new org.springframework.security.access.AccessDeniedException("Must be a member to unpin messages");
        }
        if (room.getPinnedMessages() != null) {
            room.getPinnedMessages().remove(messageId);
            roomRepository.save(room);
        }
        return RoomResponse.from(room);
    }

    public List<UserResponse> getRoomMembers(String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        // Single batch query instead of N+1 per-username lookups
        List<String> memberUsernames = room.getMembers();
        Map<String, com.substring.chat.entities.User> found = userRepository.findByUsernameIn(memberUsernames)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.substring.chat.entities.User::getUsername, u -> u));
        return memberUsernames.stream()
                .map(username -> {
                    com.substring.chat.entities.User u = found.get(username);
                    if (u != null) return UserResponse.from(u);
                    UserResponse r = new UserResponse();
                    r.setUsername(username);
                    return r;
                })
                .toList();
    }
}
