package com.Flam.CollabDraw.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class DrawAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Now a regular field, not the ID

    private String userId;
    private double x;
    private double y;
    private String color;
    private int lineWidth;
    private String status;
}
