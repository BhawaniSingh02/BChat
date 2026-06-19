package com.substring.chat.services;

import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HandleServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final HandleService service = new HandleService(userRepository);

    @Test
    void acceptsValidHandles() {
        assertThat(service.validateFormat("alice").valid()).isTrue();
        assertThat(service.validateFormat("alice_smith").valid()).isTrue();
        assertThat(service.validateFormat("alice.smith").valid()).isTrue();
        assertThat(service.validateFormat("a1b2c3").valid()).isTrue();
    }

    @Test
    void rejectsBadFormats() {
        assertThat(service.validateFormat("ab").valid()).isFalse();                 // too short
        assertThat(service.validateFormat("a".repeat(21)).valid()).isFalse();       // too long
        assertThat(service.validateFormat("Alice").valid()).isFalse();              // uppercase (caller normalizes; raw upper invalid)
        assertThat(service.validateFormat("ali ce").valid()).isFalse();             // space
        assertThat(service.validateFormat("ali-ce").valid()).isFalse();             // hyphen
        assertThat(service.validateFormat(".alice").valid()).isFalse();             // leading period
        assertThat(service.validateFormat("alice.").valid()).isFalse();             // trailing period
        assertThat(service.validateFormat("ali..ce").valid()).isFalse();            // consecutive periods
    }

    @Test
    void rejectsReservedWords() {
        assertThat(service.validateFormat("admin").valid()).isFalse();
        assertThat(service.validateFormat("support").valid()).isFalse();
        assertThat(service.validateFormat("baaat").valid()).isFalse();
    }

    @Test
    void normalizesToLowercaseAndTrim() {
        assertThat(service.normalize("  Alice_Smith  ")).isEqualTo("alice_smith");
    }

    @Test
    void availability_freeHandleIsAvailable() {
        when(userRepository.findByUniqueHandleIgnoreCase(anyString())).thenReturn(Optional.empty());
        assertThat(service.checkAvailability("freehandle", "me-internal-id").valid()).isTrue();
    }

    @Test
    void availability_takenByAnotherIsUnavailable() {
        User other = new User();
        other.setUsername("other-internal-id");
        other.setUniqueHandle("taken");
        when(userRepository.findByUniqueHandleIgnoreCase("taken")).thenReturn(Optional.of(other));

        HandleService.Validation v = service.checkAvailability("taken", "me-internal-id");
        assertThat(v.valid()).isFalse();
        assertThat(v.reason()).contains("taken");
    }

    @Test
    void availability_ownHandleIsAvailableToSelf() {
        User me = new User();
        me.setUsername("me-internal-id");
        me.setUniqueHandle("myhandle");
        when(userRepository.findByUniqueHandleIgnoreCase("myhandle")).thenReturn(Optional.of(me));

        assertThat(service.checkAvailability("myhandle", "me-internal-id").valid()).isTrue();
    }
}
