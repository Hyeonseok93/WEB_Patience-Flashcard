package com.patience.flashcard.repository;

import com.patience.flashcard.domain.Deck;
import com.patience.flashcard.domain.StudyProgress;
import com.patience.flashcard.domain.UserAccount;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyProgressRepository extends JpaRepository<StudyProgress, Long> {
  Optional<StudyProgress> findByUserAndDeck(UserAccount user, Deck deck);

  List<StudyProgress> findByUser(UserAccount user);

  void deleteByUserAndDeck(UserAccount user, Deck deck);

  /**
   * Atomic insert-or-update keyed on the (user_id, deck_id) unique constraint. Avoids the
   * find-then-save race that surfaced as a 500 when two writes landed at the same time.
   */
  @Modifying
  @Query(
      value =
          "INSERT INTO study_progress (user_id, deck_id, levels_json, queue_json, completed_count, updated_at) "
              + "VALUES (:userId, :deckId, cast(:levelsJson AS jsonb), cast(:queueJson AS jsonb), :completedCount, :updatedAt) "
              + "ON CONFLICT (user_id, deck_id) DO UPDATE SET "
              + "levels_json = EXCLUDED.levels_json, "
              + "queue_json = EXCLUDED.queue_json, "
              + "completed_count = EXCLUDED.completed_count, "
              + "updated_at = EXCLUDED.updated_at",
      nativeQuery = true)
  void upsert(
      @Param("userId") Long userId,
      @Param("deckId") Long deckId,
      @Param("levelsJson") String levelsJson,
      @Param("queueJson") String queueJson,
      @Param("completedCount") int completedCount,
      @Param("updatedAt") Instant updatedAt);
}
