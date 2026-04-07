package com.substring.chat.controllers;

import com.substring.chat.dto.request.CallSignalRequest;
import com.substring.chat.dto.response.CallEvent;
import com.substring.chat.entities.CallSession;
import com.substring.chat.services.CallService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CallSignalingController} focusing on the STOMP
 * message handler methods — particularly the busy-signal fallback.
 */
@ExtendWith(MockitoExtension.class)
class CallSignalingControllerTest {

    @Mock private CallService callService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private CallSignalingController controller;

    private Principal principal(String name) {
        return () -> name;
    }

    // ── handleOffer ────────────────────────────────────────────��───────────────

    @Test
    void handleOffer_delegatesToCallService() {
        CallSignalRequest request = new CallSignalRequest();
        request.setCallType("AUDIO");
        request.setPayload("{\"sdp\":\"offer\"}");

        CallSession session = new CallSession();
        session.setId("sess-1");
        session.setCallType(CallSession.CallType.AUDIO);
        when(callService.initiateCall(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(session);

        controller.handleOffer("conv-1", request, principal("alice"));

        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(callService).initiateCall("conv-1", "alice", "AUDIO", "{\"sdp\":\"offer\"}");
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(CallEvent.EventType.CALL_SESSION_CREATED.name());
        assertThat(eventCaptor.getValue().getCallSessionId()).isEqualTo("sess-1");
    }

    @Test
    void handleOffer_defaultsToAudioCallTypeWhenNull() {
        CallSignalRequest request = new CallSignalRequest();
        request.setCallType(null);
        request.setPayload("{\"sdp\":\"offer\"}");

        when(callService.initiateCall(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new CallSession());

        controller.handleOffer("conv-1", request, principal("alice"));

        verify(callService).initiateCall("conv-1", "alice", "AUDIO", "{\"sdp\":\"offer\"}");
    }

    @Test
    void handleOffer_sendsBusyEventToCaller_whenCalleeAlreadyInCall() {
        CallSignalRequest request = new CallSignalRequest();
        request.setCallType("AUDIO");
        request.setPayload("{\"sdp\":\"offer\"}");

        doThrow(new IllegalStateException("A call is already in progress"))
                .when(callService).initiateCall(anyString(), anyString(), anyString(), anyString());

        controller.handleOffer("conv-1", request, principal("alice"));

        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq("alice"), eq("/queue/call"), eventCaptor.capture());

        CallEvent busyEvent = eventCaptor.getValue();
        assertThat(busyEvent.getEventType()).isEqualTo(CallEvent.EventType.CALL_BUSY.name());
        assertThat(busyEvent.getConversationId()).isEqualTo("conv-1");
        assertThat(busyEvent.getFromUsername()).isEqualTo("alice");
    }

    @Test
    void handleOffer_busyEvent_preservesCallType() {
        CallSignalRequest request = new CallSignalRequest();
        request.setCallType("VIDEO");
        request.setPayload("{\"sdp\":\"offer\"}");

        doThrow(new IllegalStateException("busy")).when(callService).initiateCall(any(), any(), any(), any());

        controller.handleOffer("conv-1", request, principal("alice"));

        ArgumentCaptor<CallEvent> cap = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(anyString(), anyString(), cap.capture());
        assertThat(cap.getValue().getCallType()).isEqualTo("VIDEO");
    }

    // ── handleAnswer ────────────────────────────────��─────────────────────────

    @Test
    void handleAnswer_delegatesToCallService() {
        CallSignalRequest request = new CallSignalRequest();
        request.setPayload("{\"sdp\":\"answer\"}");

        when(callService.answerCall(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new CallSession());

        controller.handleAnswer("conv-1", "sess-1", request, principal("bob"));

        verify(callService).answerCall("conv-1", "sess-1", "bob", "{\"sdp\":\"answer\"}");
    }

    // ── handleIce ────────────────────────────────��────────────────────────────

    @Test
    void handleIce_delegatesToCallService() {
        CallSignalRequest request = new CallSignalRequest();
        request.setPayload("{\"candidate\":\"...\"}");

        controller.handleIce("conv-1", "sess-1", request, principal("alice"));

        verify(callService).relayIceCandidate("conv-1", "sess-1", "alice", "{\"candidate\":\"...\"}");
    }

    // ── handleEnd ────────────────────────────────��────────────────────────────

    @Test
    void handleEnd_delegatesToCallService() {
        when(callService.endCall(anyString(), anyString(), anyString()))
                .thenReturn(new CallSession());

        controller.handleEnd("conv-1", "sess-1", principal("alice"));

        verify(callService).endCall("conv-1", "sess-1", "alice");
    }

    // ── CALL_BUSY event type ──────────────────────────────────────────────────

    @Test
    void callBusyEventType_isDefinedInEnum() {
        // Ensure CALL_BUSY is a valid enum constant — prevents silent omissions
        CallEvent.EventType busy = CallEvent.EventType.CALL_BUSY;
        assertThat(busy.name()).isEqualTo("CALL_BUSY");
    }
}
