package com.patience.flashcard.service;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Shared signup username rules. Keep messages in sync with the frontend. */
public final class UsernameRules {

  public static final int MIN = 3;
  public static final int MAX = 32;
  public static final Pattern PATTERN = Pattern.compile("^[a-z0-9]+$");

  static final Set<String> RESERVED =
      Set.of(
          "admin",
          "administrator",
          "root",
          "system",
          "support",
          "help",
          "moderator",
          "official",
          "patience",
          "api",
          "me",
          "null",
          "undefined",
          "owner",
          "staff",
          "security",
          "login",
          "signup",
          "auth");

  private UsernameRules() {}

  public static String normalize(String raw) {
    return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
  }

  /** @return Korean reason if invalid, otherwise {@code null}. */
  public static String invalidReason(String normalized) {
    if (normalized.isEmpty()) {
      return "아이디를 입력해 주세요.";
    }
    if (!PATTERN.matcher(normalized).matches()) {
      return "영문 소문자와 숫자만 쓸 수 있어요.";
    }
    if (normalized.length() < MIN) {
      return "아이디는 3자 이상이어야 해요.";
    }
    if (normalized.length() > MAX) {
      return "아이디는 32자까지예요.";
    }
    if (RESERVED.contains(normalized)) {
      return "이 아이디는 쓸 수 없어요.";
    }
    return null;
  }
}
