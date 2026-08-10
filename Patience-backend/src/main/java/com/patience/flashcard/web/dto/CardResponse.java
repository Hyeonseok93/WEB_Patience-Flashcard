package com.patience.flashcard.web.dto;

public record CardResponse(Long id, String front, String back, int sortOrder) {}
