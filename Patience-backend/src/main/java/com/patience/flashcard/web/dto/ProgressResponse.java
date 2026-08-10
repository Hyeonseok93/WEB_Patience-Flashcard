package com.patience.flashcard.web.dto;

public record ProgressResponse(
    Long deckId, String levelsJson, String queueJson, int completedCount, boolean exists) {}
 