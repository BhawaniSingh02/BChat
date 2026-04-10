package com.substring.chat.services;

import com.substring.chat.dto.response.ContactRequestResponse;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.ContactRequest;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.ContactRequestRepository;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRequestRepository contactRequestRepository;
    private final UserRepository userRepository;

    /**
     * Send a contact request from the authenticated user to a target uniqueHandle.
     * If target has whoCanMessage=ANYONE, the request is auto-accepted.
     */
    public ContactRequestResponse sendRequest(String fromUsername, String toHandle) {
        User from = userRepository.findByUsername(fromUsername)
                .orElseThrow(() -> new UserNotFoundException(fromUsername));

        User to = userRepository.findByUniqueHandle(toHandle)
                .orElseThrow(() -> new RuntimeException("User not found: " + toHandle));

        if (from.getId().equals(to.getId())) {
            throw new IllegalArgumentException("Cannot send a contact request to yourself");
        }

        if ("NOBODY".equals(to.getWhoCanMessage())) {
            throw new RuntimeException("This user is not accepting contact requests");
        }

        boolean alreadyExists = contactRequestRepository.existsByFromUserIdAndToUserIdAndStatusIn(
                from.getId(), to.getId(), List.of("PENDING", "ACCEPTED"));
        if (alreadyExists) {
            throw new IllegalArgumentException("A request to this user already exists");
        }

        ContactRequest request = new ContactRequest();
        request.setFromUserId(from.getId());
        request.setToUserId(to.getId());

        if ("ANYONE".equals(to.getWhoCanMessage())) {
            request.setStatus("ACCEPTED");
        } else {
            request.setStatus("PENDING");
        }

        request = contactRequestRepository.save(request);
        return ContactRequestResponse.from(request, UserResponse.from(from));
    }

    /** List incoming PENDING contact requests for the authenticated user. */
    public List<ContactRequestResponse> listIncoming(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        return contactRequestRepository.findByToUserIdAndStatus(user.getId(), "PENDING")
                .stream()
                .map(req -> {
                    User from = userRepository.findById(req.getFromUserId()).orElse(null);
                    UserResponse fromResponse = from != null ? UserResponse.from(from) : null;
                    return ContactRequestResponse.from(req, fromResponse);
                })
                .toList();
    }

    /** Accept an incoming contact request. */
    public ContactRequestResponse accept(String requestId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Contact request not found"));

        if (!request.getToUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized to accept this request");
        }
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalArgumentException("Request is not in PENDING state");
        }

        request.setStatus("ACCEPTED");
        request.setUpdatedAt(Instant.now());
        request = contactRequestRepository.save(request);

        User from = userRepository.findById(request.getFromUserId()).orElse(null);
        return ContactRequestResponse.from(request, from != null ? UserResponse.from(from) : null);
    }

    /** Reject an incoming contact request. */
    public ContactRequestResponse reject(String requestId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Contact request not found"));

        if (!request.getToUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized to reject this request");
        }
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalArgumentException("Request is not in PENDING state");
        }

        request.setStatus("REJECTED");
        request.setUpdatedAt(Instant.now());
        request = contactRequestRepository.save(request);

        User from = userRepository.findById(request.getFromUserId()).orElse(null);
        return ContactRequestResponse.from(request, from != null ? UserResponse.from(from) : null);
    }

    /** Check the contact status between the authenticated user and a target user id. */
    public String getContactStatus(String viewerUsername, String targetUserId) {
        User viewer = userRepository.findByUsername(viewerUsername).orElse(null);
        if (viewer == null) return "NONE";

        return contactRequestRepository.findByFromUserIdAndToUserId(viewer.getId(), targetUserId)
                .or(() -> contactRequestRepository.findByFromUserIdAndToUserId(targetUserId, viewer.getId()))
                .map(ContactRequest::getStatus)
                .orElse("NONE");
    }
}
