package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank(message = "아이디를 입력해 주세요.")
        @Size(min = 3, max = 32, message = "아이디는 3–32자예요.")
        @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "영문과 숫자만 쓸 수 있어요.")
        String username,
    @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 72, message = "비밀번호는 8자 이상이어야 해요.")
        String password) {}
