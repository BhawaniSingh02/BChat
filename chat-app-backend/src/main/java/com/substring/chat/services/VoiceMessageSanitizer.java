package com.substring.chat.services;

import com.substring.chat.entities.Message;

import java.util.List;

/**
 * Server-side bounds for client-computed voice-message duration/waveform metadata.
 * A client could report anything, so every message-creation path (ChatController's room/DM
 * WS sends, ThreadController's thread replies, DirectMessageService's REST DM send) clamps
 * through these shared helpers rather than trusting the client at the point of persistence.
 */
public final class VoiceMessageSanitizer {

    private static final int MAX_VOICE_DURATION_SECONDS = 120;
    private static final int MAX_WAVEFORM_POINTS = 60;
    private static final int WAVEFORM_MAX_VALUE = 100;

    private VoiceMessageSanitizer() {}

    /**
     * Clamp a client-reported voice-message duration to [0, MAX_VOICE_DURATION_SECONDS].
     * Only meaningful for AUDIO messages; anything else is dropped so stray values can't
     * be smuggled onto text/image/file/video messages.
     */
    public static Integer sanitizeDuration(Message.MessageType type, Integer durationSeconds) {
        if (type != Message.MessageType.AUDIO || durationSeconds == null) {
            return null;
        }
        return Math.max(0, Math.min(durationSeconds, MAX_VOICE_DURATION_SECONDS));
    }

    /**
     * Truncate a client-computed waveform to at most MAX_WAVEFORM_POINTS samples and clamp
     * each sample into [0, WAVEFORM_MAX_VALUE], same reasoning as sanitizeDuration.
     */
    public static List<Integer> sanitizeWaveform(Message.MessageType type, List<Integer> waveform) {
        if (type != Message.MessageType.AUDIO || waveform == null || waveform.isEmpty()) {
            return null;
        }
        return waveform.stream()
                .limit(MAX_WAVEFORM_POINTS)
                .map(v -> v == null ? 0 : Math.max(0, Math.min(v, WAVEFORM_MAX_VALUE)))
                .toList();
    }
}
