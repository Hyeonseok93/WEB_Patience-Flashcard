package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailConfirmRequest(@NotBlank String email, @NotBlank String code) {}
