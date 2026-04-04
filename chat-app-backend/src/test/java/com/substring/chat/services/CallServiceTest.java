package com.substring.chat.services;

import com.substring.chat.dto.response.CallEvent;
import com.substring.chat.dto.response.CallSessionResponse;
import com.substring.chat.entities.CallSession;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.repositories.CallSessionRepository;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CallServiceTest {

    @Mock private CallSessionRepository callSessionRepository;
    @Mock private DirectConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private CallService callService;

    private DirectConversation conversation;
    private CallSession ringingSession;

    @BeforeEach
    void setUp() {
        conversation = new DirectConversation();
        conversation.setId("conv-1");
        List<String> participants = new ArrayList<>();
        participants.add("alice");
        participants.add("bob");
        conversation.setParticipants(participants);

        ringingSession = new CallSession();
        ringingSession.setId("session-1");
        ringingSession.setConversationId("conv-1");
        ringingSession.setCallerId("alice");
        ringingSession.setCalleeId("bob");
        ringingSession.setCallType(CallSession.CallType.AUDIO);
        ringingSession.setStatus(CallSession.CallStatus.RINGING);
        ringingSession.setStartedAt(Instant.now());
    }

    // ── initiateCall ──────────────────────────────────────────────────────────

    @Test
    void initiateCall_createsRingingSessionAndNotifiesCallee() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(callSessionRepository.findByConversationIdAndStatusIn(anyString(), any())).thenReturn(Optional.empty());
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> {
            CallSession s = inv.getArgument(0);
            s.setId("session-1");
            return s;
        });

        CallSession result = callService.initiateCall("conv-1", "alice", "AUDIO", "{\"sdp\":\"offer\"}");

        assertThat(result.getStatus()).isEqualTo(CallSession.CallStatus.RINGING);
        assertThat(result.getCallerId()).isEqualTo("alice");
        assertThat(result.getCalleeId()).isEqualTo("bob");
        assertThat(result.getCallType()).isEqualTo(CallSession.CallType.AUDIO);

        // Verify callee was notified
        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(CallEvent.EventType.INCOMING_CALL.name());
        assertThat(eventCaptor.getValue().getFromUsername()).isEqualTo("alice");
    }

    @Test
    void initiateCall_video_createsVideoSession() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(callSessionRepository.findByConversationIdAndStatusIn(anyString(), any())).thenReturn(Optional.empty());
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> {
            CallSession s = inv.getArgument(0);
            s.setId("session-2");
            return s;
        });

        CallSession result = callService.initiateCall("conv-1", "alice", "VIDEO", "{\"sdp\":\"offer\"}");

        assertThat(result.getCallType()).isEqualTo(CallSession.CallType.VIDEO);
    }

    @Test
    void initiateCall_throwsWhenConversationNotFound() {
        when(conversationRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> callService.initiateCall("bad", "alice", "AUDIO", null))
                .isInstanceOf(ConversationNotFoundException.class);
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void initiateCall_throwsWhenCallAlreadyInProgress() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(callSessionRepository.findByConversationIdAndStatusIn(anyString(), any()))
                .thenReturn(Optional.of(ringingSession));

        assertThatThrownBy(() -> callService.initiateCall("conv-1", "alice", "AUDIO", null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already in progress");
    }

    // ── answerCall ────────────────────────────────────────────────────────────

    @Test
    void answerCall_setsActiveAndNotifiesCaller() {
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> inv.getArgument(0));

        CallSession result = callService.answerCall("conv-1", "session-1", "bob", "{\"sdp\":\"answer\"}");

        assertThat(result.getStatus()).isEqualTo(CallSession.CallStatus.ACTIVE);
        assertThat(result.getAnsweredAt()).isNotNull();

        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(CallEvent.EventType.CALL_ANSWERED.name());
        assertThat(eventCaptor.getValue().getFromUsername()).isEqualTo("bob");
    }

    @Test
    void answerCall_throwsWhenSessionNotFound() {
        when(callSessionRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> callService.answerCall("conv-1", "bad", "bob", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void answerCall_throwsWhenNotParticipant() {
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));

        assertThatThrownBy(() -> callService.answerCall("conv-1", "session-1", "eve", "{}"))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    // ── relayIceCandidate ─────────────────────────────────────────────────────

    @Test
    void relayIceCandidate_fromCaller_notifiesCallee() {
        ringingSession.setStatus(CallSession.CallStatus.ACTIVE);
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));

        callService.relayIceCandidate("conv-1", "session-1", "alice", "{\"candidate\":\"...\"}");

        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(CallEvent.EventType.ICE_CANDIDATE.name());
    }

    @Test
    void relayIceCandidate_fromCallee_notifiesCaller() {
        ringingSession.setStatus(CallSession.CallStatus.ACTIVE);
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));

        callService.relayIceCandidate("conv-1", "session-1", "bob", "{\"candidate\":\"...\"}");

        ArgumentCaptor<CallEvent> eventCaptor = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(CallEvent.EventType.ICE_CANDIDATE.name());
    }

    // ── endCall ───────────────────────────────────────────────────────────────

    @Test
    void endCall_activeCall_setsEndedStatusAndComputesDuration() throws InterruptedException {
        ringingSession.setStatus(CallSession.CallStatus.ACTIVE);
        ringingSession.setAnsweredAt(Instant.now().minusSeconds(30));
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> inv.getArgument(0));

        CallSession result = callService.endCall("conv-1", "session-1", "alice");

        assertThat(result.getStatus()).isEqualTo(CallSession.CallStatus.ENDED);
        assertThat(result.getDurationSeconds()).isGreaterThanOrEqualTo(29);
        assertThat(result.getEndedAt()).isNotNull();

        // Notifies callee
        ArgumentCaptor<CallEvent> cap = ArgumentCaptor.forClass(CallEvent.class);
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call"), cap.capture());
        assertThat(cap.getValue().getEventType()).isEqualTo(CallEvent.EventType.CALL_ENDED.name());
    }

    @Test
    void endCall_callerCancelsRinging_setsMissedAndPostsSystemMessage() {
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        CallSession result = callService.endCall("conv-1", "session-1", "alice");

        assertThat(result.getStatus()).isEqualTo(CallSession.CallStatus.MISSED);
        // A missed-call system message should be saved
        verify(messageRepository).save(any(Message.class));
        // Callee notified
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call"), any(CallEvent.class));
    }

    @Test
    void endCall_calleeRejectsRinging_setsRejected() {
        when(callSessionRepository.findById("session-1")).thenReturn(Optional.of(ringingSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(inv -> inv.getArgument(0));

        CallSession result = callService.endCall("conv-1", "session-1", "bob");

        assertThat(result.getStatus()).isEqualTo(CallSession.CallStatus.REJECTED);
        // No missed message when callee rejects
        verify(messageRepository, never()).save(any(Message.class));
        // Caller notified
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call"), any(CallEvent.class));
    }

    @Test
    void endCall_throwsWhenSessionNotFound() {
        when(callSessionRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> callService.endCall("conv-1", "bad", "alice"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── busy signal ───────────────────────────────────────────────────────────

    @Test
    void initiateCall_throwsIllegalStateWhenCallAlreadyActive() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        // Simulate an ACTIVE session already in progress
        CallSession activeSession = new CallSession();
        activeSession.setId("active-session");
        activeSession.setStatus(CallSession.CallStatus.ACTIVE);
        when(callSessionRepository.findByConversationIdAndStatusIn(anyString(), any()))
                .thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> callService.initiateCall("conv-1", "alice", "AUDIO", null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already in progress");
        // No new session saved, no notification sent to callee
        verify(callSessionRepository, never()).save(any(CallSession.class));
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    // ── getCallHistory ────────────────────────────────────────────────────────

    @Test
    void getCallHistory_returnsSessionsForParticipant() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(callSessionRepository.findByConversationIdOrderByStartedAtDesc("conv-1"))
                .thenReturn(List.of(ringingSession));

        List<CallSessionResponse> history = callService.getCallHistory("conv-1", "alice");

        assertThat(history).hasSize(1);
        assertThat(history.get(0).getCallerId()).isEqualTo("alice");
        assertThat(history.get(0).getStatus()).isEqualTo("RINGING");
    }

    @Test
    void getCallHistory_throwsWhenUserNotParticipant() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> callService.getCallHistory("conv-1", "eve"))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getCallHistory_throwsWhenConversationNotFound() {
        when(conversationRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> callService.getCallHistory("bad", "alice"))
                .isInstanceOf(ConversationNotFoundException.class);
    }
}
