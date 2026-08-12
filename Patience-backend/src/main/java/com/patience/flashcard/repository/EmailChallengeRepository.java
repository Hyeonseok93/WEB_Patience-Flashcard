package com.patience.flashcard.repository;

import com.patience.flashcard.domain.EmailChallenge;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailChallengeRepository extends JpaRepository<EmailChallenge, Long> {
  Optional<EmailChallenge> findFirstByEmailAndConsumedAtIsNullOrderByExpiresAtDesc(String email);

  Optional<EmailChallenge> findByProofHashAndConsumedAtIsNull(String proofHash);

  @Modifying(clearAutomatically = true)
  @Query("delete from EmailChallenge c where c.email = :email and c.consumedAt is null")
  void deleteOpen(@Param("email") String email);
}
