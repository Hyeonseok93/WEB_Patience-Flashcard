package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CardUpsertRequest(
    @NotBlank @Size(max = 2000) String front, @NotBlank @Size(max = 2000) String back) {}
