package com.substring.chat.services;

import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates and resolves availability of public @usernames (uniqueHandle),
 * Instagram-style: 3–20 chars, lowercase letters/numbers/period/underscore,
 * no leading/trailing or consecutive periods, reserved words blocked.
 */
@Service
@RequiredArgsConstructor
public class HandleService {

    private static final Pattern HANDLE_PATTERN = Pattern.compile("^[a-z0-9._]{3,20}$");

    private static final Set<String> RESERVED = Set.of(
            "admin", "administrator", "support", "baaat", "help", "root", "system",
            "moderator", "mod", "official", "everyone", "here", "all", "null",
            "undefined", "me", "you", "team", "staff", "security", "no_reply", "noreply"
    );

    private final UserRepository userRepository;

    public record Validation(boolean valid, String reason) {
        static Validation ok() { return new Validation(true, null); }
        static Validation fail(String reason) { return new Validation(false, reason); }
    }

    /** Lowercase + trim — the canonical stored form. */
    public String normalize(String handle) {
        return handle == null ? "" : handle.trim().toLowerCase();
    }

    /** Format rules only (does not check availability). */
    public Validation validateFormat(String normalized) {
        if (normalized.isEmpty()) return Validation.fail("Username is required");
        if (normalized.length() < 3) return Validation.fail("Must be at least 3 characters");
        if (normalized.length() > 20) return Validation.fail("Must be at most 20 characters");
        if (!HANDLE_PATTERN.matcher(normalized).matches())
            return Validation.fail("Use only lowercase letters, numbers, . and _");
        if (normalized.startsWith(".") || normalized.endsWith("."))
            return Validation.fail("Cannot start or end with a period");
        if (normalized.contains(".."))
            return Validation.fail("Cannot contain consecutive periods");
        if (RESERVED.contains(normalized))
            return Validation.fail("This username isn't available");
        return Validation.ok();
    }

    /**
     * Format-valid AND not held by another user. The current user reclaiming their
     * own handle is considered available.
     */
    public Validation checkAvailability(String rawHandle, String currentUsername) {
        String normalized = normalize(rawHandle);
        Validation format = validateFormat(normalized);
        if (!format.valid()) return format;

        Optional<User> existing = userRepository.findByUniqueHandleIgnoreCase(normalized);
        if (existing.isPresent() && !existing.get().getUsername().equals(currentUsername)) {
            return Validation.fail("This username is taken");
        }
        return Validation.ok();
    }
}
