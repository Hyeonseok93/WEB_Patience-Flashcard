package com.patience.flashcard.web.dto;

public record UserResponse(
    Long id,
    String username,
    String email
    // 공개 후 미인증 계정을 다시 허용할 때 응답에 넣기.
    // 지금은 가입 전에 메일 인증을 끝내서 항상 true라 내려주지 않음.
    // boolean emailVerified
    ) {}
