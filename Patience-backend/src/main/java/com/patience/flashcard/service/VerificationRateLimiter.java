package com.patience.flashcard.service;

import com.patience.flashcard.web.ApiException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class VerificationRateLimiter {

  static final int LIMIT = 3;
  static final Duration WINDOW = Duration.ofMinutes(10);

  private final ConcurrentHashMap<String, ArrayDeque<Long>> attempts = new ConcurrentHashMap<>();

  public void assertAllowed(String key) {
    String id = key == null || key.isBlank() ? "unknown" : key;
    long now = System.currentTimeMillis();
    long windowMs = WINDOW.toMillis();
    boolean[] allowed = {false};
    attempts.compute(
        id,
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
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "확인 메일을 너무 자주 보냈어요. 잠시 후 다시 해 주세요.");
    }
  }
}
