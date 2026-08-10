package com.patience.flashcard.web.dto;

import com.patience.flashcard.domain.DeckSourceType;
import java.util.List;

public record DeckDetailResponse(
    Long id, String name, DeckSourceType sourceType, List<CardResponse> cards) {}
