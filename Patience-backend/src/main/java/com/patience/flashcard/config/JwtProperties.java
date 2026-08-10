package com.patience.flashcard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
    String secret, String cookieName, boolean cookieSecure, long expirationMs) {}
