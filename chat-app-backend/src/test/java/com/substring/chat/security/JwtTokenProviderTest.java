package com.substring.chat.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    private static final String TEST_SECRET =
            "dGVzdC1zZWNyZXQta2V5LWZvci10ZXN0aW5nLW9ubHktbm90LWZvci1wcm9kdWN0aW9u";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiryMs", 3600000L);
    }

    @Test
    void generateToken_returnsNonNullToken() {
        String token = jwtTokenProvider.generateToken("testuser");
        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    void getUsernameFromToken_returnsCorrectUsername() {
        String username = "alice";
        String token = jwtTokenProvider.generateToken(username);
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo(username);
    }

    @Test
    void validateToken_returnsTrueForValidToken() {
        String token = jwtTokenProvider.generateToken("bob");
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_returnsFalseForGarbageToken() {
        assertThat(jwtTokenProvider.validateToken("not.a.jwt")).isFalse();
    }

    @Test
    void validateToken_returnsFalseForEmptyString() {
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    void validateToken_returnsFalseForTamperedToken() {
        String token = jwtTokenProvider.generateToken("user1");
        String tampered = token.substring(0, token.length() - 5) + "xxxxx";
        assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    void generateToken_differentUsersProduceDifferentTokens() {
        String token1 = jwtTokenProvider.generateToken("user1");
        String token2 = jwtTokenProvider.generateToken("user2");
        assertThat(token1).isNotEqualTo(token2);
    }
}
