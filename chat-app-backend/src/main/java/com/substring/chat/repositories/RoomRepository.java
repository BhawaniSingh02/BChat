package com.substring.chat.repositories;

import com.substring.chat.entities.Room;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RoomRepository extends MongoRepository<Room, String> {

    Room findByRoomId(String roomId);

    List<Room> findByMembersContaining(String username);

    List<Room> findAllByOrderByLastMessageAtDesc();
}
