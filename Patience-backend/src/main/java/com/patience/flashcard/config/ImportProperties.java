package com.patience.flashcard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.import")
public record ImportProperties(long maxBytes, int maxRows) {}
