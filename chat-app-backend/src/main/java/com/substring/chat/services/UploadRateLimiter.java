package com.substring.chat.services;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-user upload rate limiter: max 10 file uploads per user per minute.
 * Prevents a single user from hammering Cloudinary or exhausting bandwidth.
 */
@Service
public class UploadRateLimiter {

    private static final int MAX_UPLOADS_PER_MINUTE = 10;

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
        return bucket.count().incrementAndGet() <= MAX_UPLOADS_PER_MINUTE;
    }
}
