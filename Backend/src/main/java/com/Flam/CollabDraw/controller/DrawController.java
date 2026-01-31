package com.Flam.CollabDraw.controller;

import com.Flam.CollabDraw.model.DrawAction;
import com.Flam.CollabDraw.repo.DrawingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Controller
public class DrawController {

    @Autowired
    private DrawingRepository repository; // Your H2 JPA Repository


    @MessageMapping("/draw/sendMessage")
    @SendTo("/topic/public")
    public DrawAction sendMessage(@Payload DrawAction action) {
        // You could save this to a database/list here for new users
        repository.save(action); // Store every point in H2
        return action;
    }

    @Transactional
    @MessageMapping("/draw/clearMyStuff")
    @SendTo("/topic/public")
    public Map<String, Object> clearUserStuff(@Payload Map<String, String> request) {
        String userId = request.get( "userId" );

        // 1. Delete only this user's actions from H2
        repository.deleteByUserId(userId);

        // 2. Tell everyone to refresh their canvas
        Map<String, Object> response = new HashMap<>();
        response.put("status", "USER_CLEAR");
        response.put("clearedUserId", userId);
        // Send the updated full history to everyone
        response.put("fullHistory", repository.findAllByOrderByIdAsc());
        return response;
    }

    @MessageMapping("/draw/clear")
    @SendTo("/topic/public")
    public Map<String, String> clearCanvas() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "CLEAR");
        return response;
    }

    @MessageMapping("/draw/cursorUpdate")
    @SendTo("/topic/cursors")
    public Map<String, Object> updateCursor(@Payload Map<String, Object> move) {
        return move;
    }
}
