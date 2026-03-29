package com.substring.chat.services;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple token-bucket rate limiter: max 30 messages per user per minute.
 */
@Service
public class MessageRateLimiter {

    private static final int MAX_MESSAGES_PER_MINUTE = 30;

    private record Bucket(AtomicInteger count, Instant windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean isAllowed(String username) {
        Instant now = Instant.now();
        Bucket bucket = buckets.compute(username, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart().plusSeconds(60))) {
                return new Bucket(new AtomicInteger(0), now);
            }
            return existing;
        });
        return bucket.count().incrementAndGet() <= MAX_MESSAGES_PER_MINUTE;
    }

    public int getRemainingMessages(String username) {
        Bucket bucket = buckets.get(username);
        if (bucket == null) return MAX_MESSAGES_PER_MINUTE;
        Instant now = Instant.now();
        if (now.isAfter(bucket.windowStart().plusSeconds(60))) return MAX_MESSAGES_PER_MINUTE;
        return Math.max(0, MAX_MESSAGES_PER_MINUTE - bucket.count().get());
    }
}
