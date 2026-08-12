package com.patience.flashcard.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

final class TokenHasher {

  private static final SecureRandom RANDOM = new SecureRandom();

  private TokenHasher() {}

  static String sixDigits() {
    return String.format("%06d", RANDOM.nextInt(1_000_000));
  }

  static String newRawToken() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  static String codeHash(String email, String code) {
    return sha256(email + ":" + code);
  }

  static String sha256(String raw) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }
}
