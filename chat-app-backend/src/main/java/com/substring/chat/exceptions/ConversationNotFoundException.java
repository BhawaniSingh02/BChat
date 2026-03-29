package com.substring.chat.exceptions;

public class ConversationNotFoundException extends RuntimeException {

    public ConversationNotFoundException(String id) {
        super("Direct conversation not found: " + id);
    }
}
