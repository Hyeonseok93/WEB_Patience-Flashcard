package com.patience.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.patience.flashcard.domain.Deck;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.CardRepository;
import com.patience.flashcard.repository.StudyProgressRepository;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.ProgressResponse;
import com.patience.flashcard.web.dto.ProgressUpsertRequest;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressService {

  private static final String EMPTY_LEVELS = "{\"1\":[],\"2\":[],\"3\":[]}";
  private static final String EMPTY_QUEUE = "[]";

  private final StudyProgressRepository progressRepository;
  private final CardRepository cardRepository;
  private final DeckService deckService;
  private final ObjectMapper objectMapper;

  public ProgressService(
      StudyProgressRepository progressRepository,
      CardRepository cardRepository,
      DeckService deckService,
      ObjectMapper objectMapper) {
    this.progressRepository = progressRepository;
    this.cardRepository = cardRepository;
    this.deckService = deckService;
    this.objectMapper = objectMapper;
  }

  /**
   * Read-only load. Invalid rows are returned as-is ({@code exists=true}) so the client can warn
   * and reset; GET never mutates stored progress.
   */
  @Transactional(readOnly = true)
  public ProgressResponse get(UserAccount user, Long deckId) {
    Deck deck = deckService.requireAccessible(deckId, user);
    return progressRepository
        .findByUserAndDeck(user, deck)
        .map(
            p ->
                new ProgressResponse(
                    deckId, p.getLevelsJson(), p.getQueueJson(), p.getCompletedCount(), true))
        .orElseGet(() -> new ProgressResponse(deckId, EMPTY_LEVELS, EMPTY_QUEUE, 0, false));
  }

  @Transactional
  public ProgressResponse save(UserAccount user, Long deckId, ProgressUpsertRequest request) {
    Deck deck = deckService.requireAccessible(deckId, user);
    requireValidProgress(deck, request.levelsJson(), request.queueJson(), request.completedCount());
    progressRepository.upsert(
        user.getId(),
        deck.getId(),
        request.levelsJson(),
        request.queueJson(),
        request.completedCount(),
        Instant.now());
    return new ProgressResponse(
        deckId, request.levelsJson(), request.queueJson(), request.completedCount(), true);
  }

  @Transactional
  public void reset(UserAccount user, Long deckId) {
    Deck deck = deckService.requireAccessible(deckId, user);
    progressRepository.deleteByUserAndDeck(user, deck);
  }

  /**
   * Enforces engine-aligned invariants: level count 2–4, per-level capacities (3/5/7), card ids
   * belonging to the deck with no duplicates, and {@code completedCount + inPlay == deckSize}.
   */
  private void requireValidProgress(
      Deck deck, String levelsJson, String queueJson, int completedCount) {
    JsonNode levels = readJson(levelsJson);
    if (!levels.isObject()) {
      throw badProgress();
    }
    int levelCount = levels.size();
    if (levelCount < ProgressRules.MIN_LEVELS || levelCount > ProgressRules.MAX_LEVELS) {
      throw badProgress();
    }
    for (int i = 1; i <= levelCount; i++) {
      if (!levels.has(String.valueOf(i)) || !levels.get(String.valueOf(i)).isArray()) {
        throw badProgress();
      }
    }

    JsonNode queue = readJson(queueJson);
    if (!queue.isArray()) {
      throw badProgress();
    }

    Set<Long> deckCardIds = new HashSet<>(cardRepository.findIdsByDeck(deck));
    int deckSize = deckCardIds.size();
    if (deckSize == 0) {
      throw badProgress();
    }

    if (completedCount < 0 || completedCount > deckSize) {
      throw badProgress();
    }

    Set<Long> seen = new HashSet<>();
    int inPlay = 0;

    for (int i = 1; i <= levelCount; i++) {
      JsonNode floor = levels.get(String.valueOf(i));
      int limit = ProgressRules.limitFor(i, levelCount);
      if (floor.size() > limit) {
        throw badProgress();
      }
      inPlay += collectIds(floor, deckCardIds, seen);
    }
    inPlay += collectIds(queue, deckCardIds, seen);

    if (completedCount + inPlay != deckSize) {
      throw badProgress();
    }
  }

  private int collectIds(JsonNode array, Set<Long> deckCardIds, Set<Long> seen) {
    int count = 0;
    for (JsonNode node : array) {
      if (!node.isIntegralNumber()) {
        throw badProgress();
      }
      long id = node.asLong();
      if (!deckCardIds.contains(id) || !seen.add(id)) {
        throw badProgress();
      }
      count++;
    }
    return count;
  }

  private ApiException badProgress() {
    return new ApiException(HttpStatus.BAD_REQUEST, "진행도 형식이 올바르지 않습니다.");
  }

  private JsonNode readJson(String raw) {
    try {
      JsonNode node = objectMapper.readTree(raw);
      if (node == null) {
        throw badProgress();
      }
      return node;
    } catch (ApiException ex) {
      throw ex;
    } catch (Exception ex) {
      throw badProgress();
    }
  }
}
