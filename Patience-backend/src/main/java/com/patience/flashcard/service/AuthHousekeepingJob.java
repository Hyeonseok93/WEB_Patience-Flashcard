package com.patience.flashcard.service;

import com.patience.flashcard.repository.EmailChallengeRepository;
import com.patience.flashcard.repository.RateLimitEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AuthHousekeepingJob {

  private static final Logger log = LoggerFactory.getLogger(AuthHousekeepingJob.class);

  private final EmailChallengeRepository challenges;
  private final RateLimitEventRepository rateLimitEvents;

  public AuthHousekeepingJob(
      EmailChallengeRepository challenges, RateLimitEventRepository rateLimitEvents) {
    this.challenges = challenges;
    this.rateLimitEvents = rateLimitEvents;
  }

  /** Drop expired/consumed challenges and old rate-limit hits hourly. */
  @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
  @Transactional
  public void cleanup() {
    Instant now = Instant.now();
    int challengesRemoved = challenges.deleteExpiredOrConsumed(now);
    int rateRemoved = rateLimitEvents.deleteOlderThan(now.minus(1, ChronoUnit.DAYS));
    if (challengesRemoved > 0 || rateRemoved > 0) {
      log.info(
          "Auth housekeeping removed {} email challenges and {} rate-limit events",
          challengesRemoved,
          rateRemoved);
    }
  }
}
