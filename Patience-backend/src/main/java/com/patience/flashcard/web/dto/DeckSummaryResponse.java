package com.patience.flashcard.web.dto;

import com.patience.flashcard.domain.DeckSourceType;
import java.time.Instant;

public record DeckSummaryResponse(
    Long id,
    String name,
    DeckSourceType sourceType,
    long cardCount,
    Integer studyLevels,
    Instant updatedAt) {}
