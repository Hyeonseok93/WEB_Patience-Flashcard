package com.patience.flashcard.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank(message = "닉네임을 입력해 주세요.")
        @Size(min = 3, max = 10, message = "닉네임은 3–10자예요.")
        @Pattern(regexp = "^[a-z0-9]+$", message = "영문 소문자와 숫자만 쓸 수 있어요.")
        String username,
    @NotBlank(message = "이메일을 입력해 주세요.")
        @Size(max = 254, message = "이메일이 너무 길어요.")
        String email,
    @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 72, message = "비밀번호는 8자 이상이어야 해요.")
        String password) {}
