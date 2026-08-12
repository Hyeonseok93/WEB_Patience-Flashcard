package com.patience.flashcard.web.dto;

public record ProgressResponse(
    Long deckId,
    String levelsJson,
    String queueJson,
    int completedCount,
    int clearCount,
    boolean exists) {}
