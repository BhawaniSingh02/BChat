package com.substring.chat.dto.response;

import java.util.List;

/**
 * Cursor-paginated response for message history. {@code nextCursor} is the
 * epoch-millis timestamp of the oldest item in {@code content} — pass it back
 * as the {@code before} query param to fetch the next older page.
 */
public record CursorPage<T>(List<T> content, Long nextCursor, boolean hasMore) {
}
