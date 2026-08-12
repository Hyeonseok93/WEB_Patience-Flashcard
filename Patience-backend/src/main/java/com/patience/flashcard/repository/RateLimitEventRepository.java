package com.patience.flashcard.repository;

import com.patience.flashcard.domain.RateLimitEvent;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RateLimitEventRepository extends JpaRepository<RateLimitEvent, Long> {
  long countByBucketKeyAndCreatedAtAfter(String bucketKey, Instant after);

  @Modifying(clearAutomatically = true)
  @Query("delete from RateLimitEvent e where e.createdAt < :cutoff")
  int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
