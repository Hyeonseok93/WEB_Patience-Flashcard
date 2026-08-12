package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.patience.flashcard.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ConfirmRateLimiterTest {

  @Test
  void eighthAttemptIsAllowedNinthIsNot() {
    ConfirmRateLimiter limiter = new ConfirmRateLimiter();
    for (int i = 0; i < ConfirmRateLimiter.LIMIT; i++) {
      assertThatCode(() -> limiter.assertAllowed("10.0.0.8:a@b.co")).doesNotThrowAnyException();
    }
    assertThatThrownBy(() -> limiter.assertAllowed("10.0.0.8:a@b.co"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
  }
}
