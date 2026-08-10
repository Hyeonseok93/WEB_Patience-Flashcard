package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProgressUpsertRequest(
    @NotBlank @Size(max = 200_000, message = "진행도 데이터가 너무 큽니다.") String levelsJson,
    @NotBlank @Size(max = 200_000, message = "진행도 데이터가 너무 큽니다.") String queueJson,
    @NotNull @PositiveOrZero(message = "값은 0 이상이어야 합니다.") Integer completedCount) {}
