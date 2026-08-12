package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "이메일을 입력해 주세요.") @Size(max = 254) String email,
    @NotBlank @Size(max = 72, message = "비밀번호는 72자를 넘을 수 없어요.") String password) {}
