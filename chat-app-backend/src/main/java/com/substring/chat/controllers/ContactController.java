package com.substring.chat.controllers;

import com.substring.chat.dto.request.SendContactRequestRequest;
import com.substring.chat.dto.response.ContactRequestResponse;
import com.substring.chat.services.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    /** Send a contact request to a user by their uniqueHandle. */
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(
            @Valid @RequestBody SendContactRequestRequest request,
            Principal principal) {
        try {
            ContactRequestResponse result = contactService.sendRequest(principal.getName(), request.getToHandle());
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("detail", e.getMessage()));
        }
    }

    /** List all incoming pending contact requests. */
    @GetMapping("/requests")
    public ResponseEntity<List<ContactRequestResponse>> listIncoming(Principal principal) {
        return ResponseEntity.ok(contactService.listIncoming(principal.getName()));
    }

    /** Accept a contact request. */
    @PostMapping("/request/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable String id, Principal principal) {
        try {
            return ResponseEntity.ok(contactService.accept(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", e.getMessage()));
        }
    }

    /** Reject a contact request. */
    @PostMapping("/request/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable String id, Principal principal) {
        try {
            return ResponseEntity.ok(contactService.reject(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", e.getMessage()));
        }
    }
}
