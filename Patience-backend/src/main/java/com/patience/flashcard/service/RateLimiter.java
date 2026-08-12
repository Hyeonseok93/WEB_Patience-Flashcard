package com.patience.flashcard.service;

import com.patience.flashcard.domain.RateLimitEvent;
import com.patience.flashcard.repository.RateLimitEventRepository;
import com.patience.flashcard.web.ApiException;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** DB-backed sliding-window caps — safe across multiple backend instances. */
@Component
public class RateLimiter {

  public enum Action {
    LOGIN(10, Duration.ofMinutes(10), "로그인을 너무 자주 시도했어요. 잠시 후 다시 해 주세요."),
    SIGNUP(5, Duration.ofMinutes(10), "가입 시도가 너무 많아요. 잠시 후 다시 해 주세요."),
    CONFIRM(8, Duration.ofMinutes(10), "인증 확인을 너무 자주 시도했어요. 잠시 후 다시 해 주세요."),
    VERIFICATION(3, Duration.ofMinutes(10), "확인 메일을 너무 자주 보냈어요. 잠시 후 다시 해 주세요."),
    LOOKUP(30, Duration.ofMinutes(1), "확인이 잠시 밀렸어요. 조금 뒤에 다시 쳐 보세요.");

    final int limit;
    final Duration window;
    final String message;

    Action(int limit, Duration window, String message) {
      this.limit = limit;
      this.window = window;
      this.message = message;
    }
  }

  private final RateLimitEventRepository events;

  public RateLimiter(RateLimitEventRepository events) {
    this.events = events;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void assertAllowed(Action action, String key) {
    String id = (key == null || key.isBlank()) ? "unknown" : key;
    // Hash so long emails cannot blow the 191-char bucket_key column.
    String bucket = action.name() + ":" + TokenHasher.sha256(id);
    Instant now = Instant.now();
    Instant windowStart = now.minus(action.window);
    long hits = events.countByBucketKeyAndCreatedAtAfter(bucket, windowStart);
    if (hits >= action.limit) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, action.message);
    }
    events.save(new RateLimitEvent(bucket, now));
  }
}
