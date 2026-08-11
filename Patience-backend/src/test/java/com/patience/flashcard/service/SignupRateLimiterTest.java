package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.patience.flashcard.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class SignupRateLimiterTest {

  @Test
  void fifthAttemptFromSameIpIsAllowedSixthIsNot() {
    SignupRateLimiter limiter = new SignupRateLimiter();
    for (int i = 0; i < SignupRateLimiter.LIMIT; i++) {
      assertThatCode(() -> limiter.assertAllowed("10.0.0.8")).doesNotThrowAnyException();
    }
    assertThatThrownBy(() -> limiter.assertAllowed("10.0.0.8"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    assertThatCode(() -> limiter.assertAllowed("10.0.0.9")).doesNotThrowAnyException();
  }
}
