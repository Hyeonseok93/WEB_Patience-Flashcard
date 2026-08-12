package com.patience.flashcard.service;

import java.util.Locale;
import java.util.regex.Pattern;

/** Keep messages in sync with the frontend. */
public final class EmailRules {

  public static final int MAX = 254;
  private static final Pattern PATTERN =
      Pattern.compile("^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$");

  private EmailRules() {}

  public static String normalize(String raw) {
    return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
  }

  public static String invalidReason(String normalized) {
    if (normalized.isEmpty()) {
      return "이메일을 입력해 주세요.";
    }
    if (normalized.length() > MAX) {
      return "이메일이 너무 길어요.";
    }
    if (!PATTERN.matcher(normalized).matches()) {
      return "이메일 형식을 확인해 주세요.";
    }
    return null;
  }
}
