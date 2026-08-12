package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.patience.flashcard.domain.RateLimitEvent;
import com.patience.flashcard.repository.RateLimitEventRepository;
import com.patience.flashcard.web.ApiException;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class RateLimiterTest {

  @Mock RateLimitEventRepository events;
  RateLimiter limiter;

  @BeforeEach
  void setUp() {
    limiter = new RateLimiter(events);
  }

  @Test
  void loginTenthAllowedEleventhBlocked() {
    String bucket = "LOGIN:" + TokenHasher.sha256("10.0.0.8");
    when(events.countByBucketKeyAndCreatedAtAfter(eq(bucket), any(Instant.class)))
        .thenReturn(0L, 1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L);
    when(events.save(any(RateLimitEvent.class))).thenAnswer(inv -> inv.getArgument(0));

    for (int i = 0; i < RateLimiter.Action.LOGIN.limit; i++) {
      assertThatCode(() -> limiter.assertAllowed(RateLimiter.Action.LOGIN, "10.0.0.8"))
          .doesNotThrowAnyException();
    }
    assertThatThrownBy(() -> limiter.assertAllowed(RateLimiter.Action.LOGIN, "10.0.0.8"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    verify(events, times(RateLimiter.Action.LOGIN.limit)).save(any(RateLimitEvent.class));
  }

  @Test
  void actionsDoNotShareBuckets() {
    when(events.countByBucketKeyAndCreatedAtAfter(anyString(), any(Instant.class))).thenReturn(0L);
    when(events.save(any(RateLimitEvent.class))).thenAnswer(inv -> inv.getArgument(0));

    for (int i = 0; i < RateLimiter.Action.SIGNUP.limit; i++) {
      limiter.assertAllowed(RateLimiter.Action.SIGNUP, "10.0.0.1");
    }
    assertThatCode(() -> limiter.assertAllowed(RateLimiter.Action.LOGIN, "10.0.0.1"))
        .doesNotThrowAnyException();
  }
}
