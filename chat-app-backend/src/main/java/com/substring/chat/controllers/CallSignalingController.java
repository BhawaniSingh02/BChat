package com.substring.chat.controllers;

import com.substring.chat.dto.request.CallSignalRequest;
import com.substring.chat.dto.response.CallEvent;
import com.substring.chat.dto.response.CallSessionResponse;
import com.substring.chat.entities.CallSession;
import com.substring.chat.services.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/**
 * Handles WebRTC call signaling via STOMP WebSocket messages.
 *
 * <p>STOMP destinations:</p>
 * <pre>
 *   /app/call.offer/{conversationId}        → initiate call (offer SDP)
 *   /app/call.answer/{conversationId}/{id}  → answer call (answer SDP)
 *   /app/call.ice/{conversationId}/{id}     → relay ICE candidate
 *   /app/call.end/{conversationId}/{id}     → hang up or reject
 * </pre>
 *
 * <p>All events are forwarded to {@code /user/queue/call} for the target user.</p>
 */
@Controller
@RestController
@RequestMapping("/api/v1/calls")
@RequiredArgsConstructor
public class CallSignalingController {

    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;

    // ── WebSocket STOMP handlers ──────────────────────────────────────────────

    /** Caller initiates a call by sending a WebRTC offer SDP. */
    @MessageMapping("/call.offer/{conversationId}")
    public void handleOffer(
            @DestinationVariable String conversationId,
            @Payload CallSignalRequest request,
            Principal principal) {
        try {
            callService.initiateCall(
                    conversationId,
                    principal.getName(),
                    request.getCallType() != null ? request.getCallType() : "AUDIO",
                    request.getPayload());
        } catch (IllegalStateException e) {
            // Callee is already on another call — notify the caller with BUSY signal
            CallEvent busyEvent = CallEvent.builder()
                    .eventType(CallEvent.EventType.CALL_BUSY.name())
                    .conversationId(conversationId)
                    .fromUsername(principal.getName())
                    .callType(request.getCallType() != null ? request.getCallType() : "AUDIO")
                    .payload("On another call")
                    .build();
            messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/call", busyEvent);
        }
    }

    /** Callee answers a call by sending a WebRTC answer SDP. */
    @MessageMapping("/call.answer/{conversationId}/{callSessionId}")
    public void handleAnswer(
            @DestinationVariable String conversationId,
            @DestinationVariable String callSessionId,
            @Payload CallSignalRequest request,
            Principal principal) {
        callService.answerCall(conversationId, callSessionId, principal.getName(), request.getPayload());
    }

    /** Either side sends an ICE candidate to relay to the other peer. */
    @MessageMapping("/call.ice/{conversationId}/{callSessionId}")
    public void handleIce(
            @DestinationVariable String conversationId,
            @DestinationVariable String callSessionId,
            @Payload CallSignalRequest request,
            Principal principal) {
        callService.relayIceCandidate(conversationId, callSessionId, principal.getName(), request.getPayload());
    }

    /** Either side hangs up or rejects the call. */
    @MessageMapping("/call.end/{conversationId}/{callSessionId}")
    public void handleEnd(
            @DestinationVariable String conversationId,
            @DestinationVariable String callSessionId,
            Principal principal) {
        callService.endCall(conversationId, callSessionId, principal.getName());
    }

    // ── REST endpoints ────────────────────────────────────────────────────────

    /** GET call history for a DM conversation. */
    @GetMapping("/{conversationId}/history")
    public ResponseEntity<List<CallSessionResponse>> getCallHistory(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(callService.getCallHistory(conversationId, userDetails.getUsername()));
    }
}
