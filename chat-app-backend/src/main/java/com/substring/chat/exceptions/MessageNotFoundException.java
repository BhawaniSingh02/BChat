package com.substring.chat.exceptions;

public class MessageNotFoundException extends RuntimeException {
    public MessageNotFoundException(String messageId) {
        super("Message not found: " + messageId);
    }
}
