package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank @Size(max = 64) String username,
    @NotBlank @Size(max = 72, message = "비밀번호는 72자를 넘을 수 없어요.") String password) {}
