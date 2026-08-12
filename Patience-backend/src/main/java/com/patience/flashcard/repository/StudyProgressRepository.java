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
   * Atomic insert-or-update. {@code clear_count} increments in SQL when completed_count first
   * reaches {@code deckSize}, so concurrent victory saves cannot double-count.
   */
  @Modifying
  @Query(
      value =
          "INSERT INTO study_progress (user_id, deck_id, levels_json, queue_json, completed_count, clear_count, updated_at) "
              + "VALUES (:userId, :deckId, cast(:levelsJson AS jsonb), cast(:queueJson AS jsonb), :completedCount, "
              + "CASE WHEN :deckSize > 0 AND :completedCount = :deckSize THEN 1 ELSE 0 END, :updatedAt) "
              + "ON CONFLICT (user_id, deck_id) DO UPDATE SET "
              + "levels_json = EXCLUDED.levels_json, "
              + "queue_json = EXCLUDED.queue_json, "
              + "clear_count = CASE "
              + "  WHEN :deckSize > 0 AND EXCLUDED.completed_count = :deckSize "
              + "       AND study_progress.completed_count < :deckSize "
              + "  THEN study_progress.clear_count + 1 "
              + "  ELSE study_progress.clear_count END, "
              + "completed_count = EXCLUDED.completed_count, "
              + "updated_at = EXCLUDED.updated_at",
      nativeQuery = true)
  void upsert(
      @Param("userId") Long userId,
      @Param("deckId") Long deckId,
      @Param("levelsJson") String levelsJson,
      @Param("queueJson") String queueJson,
      @Param("completedCount") int completedCount,
      @Param("deckSize") int deckSize,
      @Param("updatedAt") Instant updatedAt);

  /**
   * Drop play state but keep clear_count by rewriting to an inactive stub. Prefer delete when
   * clear_count is already 0 (handled in service).
   */
  @Modifying
  @Query(
      value =
          "UPDATE study_progress SET levels_json = cast(:levelsJson AS jsonb), "
              + "queue_json = cast(:queueJson AS jsonb), completed_count = 0, updated_at = :updatedAt "
              + "WHERE user_id = :userId AND deck_id = :deckId",
      nativeQuery = true)
  void clearPlayState(
      @Param("userId") Long userId,
      @Param("deckId") Long deckId,
      @Param("levelsJson") String levelsJson,
      @Param("queueJson") String queueJson,
      @Param("updatedAt") Instant updatedAt);
}
