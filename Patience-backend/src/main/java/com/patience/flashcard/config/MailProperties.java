package com.patience.flashcard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
    String from
    // 공개 서비스: 인증 링크(매직 링크)를 다시 쓸 때 사이트 주소.
    // String publicBaseUrl
    ) {}
