package com.patience.flashcard.service;

import com.patience.flashcard.web.ApiException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** In-memory per-IP cap for login. Fine for a single backend instance. */
@Component
public class LoginRateLimiter {

  static final int LIMIT = 10;
  static final Duration WINDOW = Duration.ofMinutes(10);

  private final ConcurrentHashMap<String, ArrayDeque<Long>> attempts = new ConcurrentHashMap<>();

  public void assertAllowed(String ip) {
    String key = ip == null || ip.isBlank() ? "unknown" : ip;
    long now = System.currentTimeMillis();
    long windowMs = WINDOW.toMillis();
    boolean[] allowed = {false};
    attempts.compute(
        key,
        (k, existing) -> {
          ArrayDeque<Long> times = existing == null ? new ArrayDeque<>() : existing;
          while (!times.isEmpty() && now - times.peekFirst() > windowMs) {
            times.pollFirst();
          }
          if (times.size() >= LIMIT) {
            return times;
          }
          times.addLast(now);
          allowed[0] = true;
          return times;
        });
    if (!allowed[0]) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "로그인을 너무 자주 시도했어요. 잠시 후 다시 해 주세요.");
    }
  }
}
