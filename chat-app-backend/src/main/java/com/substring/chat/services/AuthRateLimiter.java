package com.substring.chat.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * IP-based rate limiter for authentication endpoints.
 * Login: max 10 attempts per IP per 15 minutes (configurable via auth.rate-limit.login.max).
 * Register: max 5 attempts per IP per hour (configurable via auth.rate-limit.register.max).
 */
@Service
public class AuthRateLimiter {

    private final int maxLoginAttempts;
    private static final long LOGIN_WINDOW_SECONDS = 15 * 60;

    private final int maxRegisterAttempts;
    private static final long REGISTER_WINDOW_SECONDS = 60 * 60;

    public AuthRateLimiter(
            @Value("${auth.rate-limit.login.max:10}") int maxLoginAttempts,
            @Value("${auth.rate-limit.register.max:5}") int maxRegisterAttempts) {
        this.maxLoginAttempts = maxLoginAttempts;
        this.maxRegisterAttempts = maxRegisterAttempts;
    }

    private record Bucket(AtomicInteger count, Instant windowStart) {}

    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();

    public boolean isLoginAllowed(String ip) {
        return isAllowed(loginBuckets, ip, maxLoginAttempts, LOGIN_WINDOW_SECONDS);
    }

    public boolean isRegisterAllowed(String ip) {
        return isAllowed(registerBuckets, ip, maxRegisterAttempts, REGISTER_WINDOW_SECONDS);
    }

    private boolean isAllowed(ConcurrentHashMap<String, Bucket> buckets,
                               String key, int max, long windowSeconds) {
        Instant now = Instant.now();
        Bucket bucket = buckets.compute(key, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart().plusSeconds(windowSeconds))) {
                return new Bucket(new AtomicInteger(0), now);
            }
            return existing;
        });
        return bucket.count().incrementAndGet() <= max;
    }
}
