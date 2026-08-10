package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patience.flashcard.domain.Deck;
import com.patience.flashcard.domain.DeckSourceType;
import com.patience.flashcard.domain.StudyProgress;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.CardRepository;
import com.patience.flashcard.repository.StudyProgressRepository;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.ProgressResponse;
import com.patience.flashcard.web.dto.ProgressUpsertRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

  @Mock StudyProgressRepository progressRepository;
  @Mock CardRepository cardRepository;
  @Mock DeckService deckService;

  ProgressService progressService;
  UserAccount user;
  Deck deck;

  @BeforeEach
  void setUp() {
    progressService =
        new ProgressService(progressRepository, cardRepository, deckService, new ObjectMapper());
    user = new UserAccount();
    ReflectionTestUtils.setField(user, "id", 1L);
    user.setUsername("alice");
    deck = new Deck();
    ReflectionTestUtils.setField(deck, "id", 7L);
    deck.setName("mine");
    deck.setSourceType(DeckSourceType.USER);
    when(deckService.requireAccessible(7L, user)).thenReturn(deck);
  }

  private void stubDeckCards() {
    when(cardRepository.findIdsByDeck(deck)).thenReturn(List.of(11L, 12L, 13L));
  }

  @Test
  void saveAcceptsCardIdsBelongingToDeck() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[11],\"2\":[12],\"3\":[]}", "[13]", 0);

    progressService.save(user, 7L, request);

    verify(progressRepository)
        .upsert(anyLong(), anyLong(), anyString(), anyString(), anyInt(), any());
  }

  @Test
  void saveAcceptsFullyCompletedDeck() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[],\"2\":[],\"3\":[]}", "[]", 3);

    progressService.save(user, 7L, request);

    verify(progressRepository)
        .upsert(anyLong(), anyLong(), anyString(), anyString(), anyInt(), any());
  }

  @Test
  void saveRejectsFrontTextLegacyPayload() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[\"あ\"],\"2\":[],\"3\":[]}", "[]", 0);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);

    verify(progressRepository, never())
        .upsert(anyLong(), anyLong(), anyString(), anyString(), anyInt(), any());
  }

  @Test
  void saveRejectsUnknownCardId() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[999],\"2\":[],\"3\":[]}", "[]", 0);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveRejectsDuplicateCardIds() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[11],\"2\":[11],\"3\":[]}", "[]", 0);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveRejectsLevelOverCapacity() {
    when(cardRepository.findIdsByDeck(deck)).thenReturn(List.of(11L, 12L, 13L, 14L));
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[11,12,13,14],\"2\":[],\"3\":[]}", "[]", 0);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveRejectsCompletedCountAboveDeckSize() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[],\"2\":[],\"3\":[]}", "[]", 4);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveRejectsMissingCardsInAccounting() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[11],\"2\":[],\"3\":[]}", "[12]", 0);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveRejectsCompletedPlusInPlayMismatch() {
    stubDeckCards();
    ProgressUpsertRequest request =
        new ProgressUpsertRequest("{\"1\":[11],\"2\":[12],\"3\":[]}", "[13]", 1);

    assertThatThrownBy(() -> progressService.save(user, 7L, request))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void getReturnsExistingValidProgress() {
    stubDeckCards();
    StudyProgress row = new StudyProgress();
    row.setLevelsJson("{\"1\":[11],\"2\":[12],\"3\":[]}");
    row.setQueueJson("[13]");
    row.setCompletedCount(0);
    when(progressRepository.findByUserAndDeck(user, deck)).thenReturn(Optional.of(row));

    ProgressResponse response = progressService.get(user, 7L);

    assertThat(response.exists()).isTrue();
    assertThat(response.completedCount()).isZero();
    verify(progressRepository, never()).deleteByUserAndDeck(user, deck);
  }

  @Test
  void getHealsCorruptProgressByDeletingAndReturningEmpty() {
    stubDeckCards();
    StudyProgress row = new StudyProgress();
    row.setLevelsJson("{\"1\":[11],\"2\":[],\"3\":[]}");
    row.setQueueJson("[]");
    row.setCompletedCount(0); // missing cards 12,13
    when(progressRepository.findByUserAndDeck(user, deck)).thenReturn(Optional.of(row));

    ProgressResponse response = progressService.get(user, 7L);

    assertThat(response.exists()).isFalse();
    assertThat(response.completedCount()).isZero();
    verify(progressRepository).deleteByUserAndDeck(user, deck);
  }
}
