package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameDeckRequest(
    @NotBlank @Size(max = 200) String name) {}
