package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank String email,
    @NotBlank String code,
    @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 72, message = "비밀번호는 8자 이상이어야 해요.")
        String password) {}
