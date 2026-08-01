package com.substring.chat.services;

import com.substring.chat.dto.request.CreateRoomRequest;
import com.substring.chat.dto.response.RoomResponse;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies the Spring-managed {@code @Cacheable}/{@code @CacheEvict} behavior on
 * RoomService — this requires the real AOP proxy (unlike RoomServiceTest's plain
 * Mockito @InjectMocks unit tests, which bypass caching entirely). Runs against the
 * "test" profile's in-memory cache manager (see CacheConfig / application-test.properties).
 */
@SpringBootTest
@ActiveProfiles("test")
class RoomServiceCachingTest {

    @Autowired
    private RoomService roomService;

    @Autowired
    private CacheManager cacheManager;

    @MockBean
    private RoomRepository roomRepository;

    // The Spring test context (and its caches) is reused across test methods —
    // clear so each test starts with an empty cache.
    @BeforeEach
    void clearCaches() {
        for (String name : List.of("allRooms", "userRooms", "userProfile")) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        }
    }

    private Room room(String roomId) {
        Room r = new Room();
        r.setId(roomId + "-id");
        r.setRoomId(roomId);
        r.setName(roomId);
        r.setCreatedBy("alice");
        r.setMembers(new ArrayList<>(List.of("alice")));
        r.setCreatedAt(Instant.now());
        return r;
    }

    @Test
    void getAllRooms_hitsRepositoryOnlyOnceAcrossRepeatedCalls() {
        when(roomRepository.findAllByOrderByLastMessageAtDesc()).thenReturn(List.of(room("cache-room-1")));

        roomService.getAllRooms();
        roomService.getAllRooms();
        roomService.getAllRooms();

        verify(roomRepository, times(1)).findAllByOrderByLastMessageAtDesc();
    }

    @Test
    void createRoom_evictsAllRoomsCacheSoNextReadReflectsTheNewRoom() {
        when(roomRepository.findAllByOrderByLastMessageAtDesc())
                .thenReturn(List.of(room("cache-room-2")))
                .thenReturn(List.of(room("cache-room-2"), room("cache-room-3")));
        when(roomRepository.findByRoomId("cache-room-3")).thenReturn(null);
        when(roomRepository.save(any(Room.class))).thenReturn(room("cache-room-3"));

        List<RoomResponse> before = roomService.getAllRooms();
        assertThat(before).hasSize(1);

        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomId("cache-room-3");
        request.setName("Cache Room 3");
        roomService.createRoom(request, "alice");

        List<RoomResponse> after = roomService.getAllRooms();
        assertThat(after).hasSize(2);
        verify(roomRepository, times(2)).findAllByOrderByLastMessageAtDesc();
    }

    @Test
    void getRoomsForUser_isPerUserCachedAndEvictedOnJoin() {
        when(roomRepository.findByMembersContaining("bob"))
                .thenReturn(List.of())
                .thenReturn(List.of(room("cache-room-4")));
        when(roomRepository.findByRoomId("cache-room-4")).thenReturn(room("cache-room-4"));
        when(roomRepository.save(any(Room.class))).thenReturn(room("cache-room-4"));

        assertThat(roomService.getRoomsForUser("bob")).isEmpty();
        assertThat(roomService.getRoomsForUser("bob")).isEmpty(); // still cached, repo not hit again
        verify(roomRepository, times(1)).findByMembersContaining("bob");

        roomService.joinRoom("cache-room-4", "bob"); // evicts bob's userRooms entry

        assertThat(roomService.getRoomsForUser("bob")).hasSize(1);
        verify(roomRepository, times(2)).findByMembersContaining("bob");
    }
}
