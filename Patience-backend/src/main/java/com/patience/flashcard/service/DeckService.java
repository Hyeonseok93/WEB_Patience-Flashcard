package com.patience.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.patience.flashcard.domain.Card;
import com.patience.flashcard.domain.Deck;
import com.patience.flashcard.domain.DeckSourceType;
import com.patience.flashcard.domain.StudyProgress;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.CardRepository;
import com.patience.flashcard.repository.DeckRepository;
import com.patience.flashcard.repository.StudyProgressRepository;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.CardResponse;
import com.patience.flashcard.web.dto.CardUpsertRequest;
import com.patience.flashcard.web.dto.DeckDetailResponse;
import com.patience.flashcard.web.dto.DeckSummaryResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DeckService {

  private final DeckRepository deckRepository;
  private final CardRepository cardRepository;
  private final StudyProgressRepository progressRepository;
  private final ProgressService progressService;
  private final XlsxDeckImporter xlsxImporter;
  private final XlsxDeckExporter xlsxExporter;
  private final ObjectMapper objectMapper;

  public DeckService(
      DeckRepository deckRepository,
      CardRepository cardRepository,
      StudyProgressRepository progressRepository,
      @Lazy ProgressService progressService,
      XlsxDeckImporter xlsxImporter,
      XlsxDeckExporter xlsxExporter,
      ObjectMapper objectMapper) {
    this.deckRepository = deckRepository;
    this.cardRepository = cardRepository;
    this.progressRepository = progressRepository;
    this.progressService = progressService;
    this.xlsxImporter = xlsxImporter;
    this.xlsxExporter = xlsxExporter;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<DeckSummaryResponse> listBuiltin(UserAccount user) {
    return summarize(
        deckRepository.findBySourceTypeOrderBySortOrderAscNameAsc(DeckSourceType.BUILTIN), user);
  }

  @Transactional(readOnly = true)
  public List<DeckSummaryResponse> listMine(UserAccount user) {
    return summarize(
        deckRepository.findByOwnerAndSourceTypeOrderByUpdatedAtDesc(user, DeckSourceType.USER),
        user);
  }

  private List<DeckSummaryResponse> summarize(List<Deck> decks, UserAccount user) {
    Map<Long, Integer> levelsByDeck = new HashMap<>();
    Map<Long, Integer> clearsByDeck = new HashMap<>();
    for (StudyProgress progress : progressRepository.findByUser(user)) {
      long deckId = progress.getDeck().getId();
      if (progress.getClearCount() > 0) {
        clearsByDeck.put(deckId, progress.getClearCount());
      }
      if (!ProgressActivity.isActive(
          objectMapper, progress.getLevelsJson(), progress.getQueueJson())) {
        continue;
      }
      Integer levels = levelCountOf(progress.getLevelsJson());
      if (levels != null) {
        levelsByDeck.put(deckId, levels);
      }
    }
    Map<Long, Long> countsByDeck = cardCountsByDeck(decks);
    return decks.stream()
        .map(
            deck ->
                toSummary(
                    deck,
                    countsByDeck.getOrDefault(deck.getId(), 0L),
                    levelsByDeck.get(deck.getId()),
                    clearsByDeck.getOrDefault(deck.getId(), 0)))
        .toList();
  }

  private Map<Long, Long> cardCountsByDeck(List<Deck> decks) {
    if (decks.isEmpty()) {
      return Map.of();
    }
    Map<Long, Long> map = new HashMap<>();
    for (Object[] row : cardRepository.countByDecks(decks)) {
      map.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
    }
    return map;
  }

  private Integer levelCountOf(String levelsJson) {
    if (levelsJson == null || levelsJson.isBlank()) {
      return null;
    }
    try {
      JsonNode node = objectMapper.readTree(levelsJson);
      if (node == null || !node.isObject()) {
        return null;
      }
      int size = node.size();
      return size >= 2 ? size : null;
    } catch (Exception ex) {
      return null;
    }
  }

  @Transactional(readOnly = true)
  public DeckDetailResponse getAccessibleDeck(Long deckId, UserAccount user) {
    Deck deck = requireAccessible(deckId, user);
    List<CardResponse> cards =
        cardRepository.findByDeckOrderBySortOrderAscIdAsc(deck).stream()
            .map(
                c ->
                    new CardResponse(
                        c.getId(), c.getFrontText(), c.getBackText(), c.getSortOrder()))
            .toList();
    return new DeckDetailResponse(deck.getId(), deck.getName(), deck.getSourceType(), cards);
  }

  @Transactional
  public DeckSummaryResponse importXlsx(UserAccount user, String deckName, MultipartFile file) {
    xlsxImporter.validateUpload(file);
    String name = resolveDeckName(user, deckName, file.getOriginalFilename(), null);

    List<XlsxDeckImporter.ParsedCard> parsed = xlsxImporter.parse(file);
    if (parsed.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "유효한 카드 행이 없습니다. A열=앞면, B열=뒷면을 확인하세요.");
    }

    Deck deck = new Deck();
    deck.setName(name);
    deck.setOwner(user);
    deck.setSourceType(DeckSourceType.USER);
    deckRepository.save(deck);

    List<Card> cards = buildCards(deck, parsed);
    cardRepository.saveAll(cards);
    return toSummary(deck, cards.size(), null, 0);
  }

  @Transactional
  public DeckSummaryResponse createEmpty(UserAccount user, String deckName) {
    String name = resolveDeckName(user, deckName, "새 세트", null);
    Deck deck = new Deck();
    deck.setName(name);
    deck.setOwner(user);
    deck.setSourceType(DeckSourceType.USER);
    deckRepository.save(deck);
    return toSummary(deck, 0, null, 0);
  }

  @Transactional
  public DeckSummaryResponse copyAccessible(Long deckId, UserAccount user) {
    Deck source = requireAccessible(deckId, user);
    List<Card> sourceCards = cardRepository.findByDeckOrderBySortOrderAscIdAsc(source);
    String name = uniqueCopyName(user, source.getName());
    Deck deck = new Deck();
    deck.setName(name);
    deck.setOwner(user);
    deck.setSourceType(DeckSourceType.USER);
    deckRepository.save(deck);
    List<Card> copies = new ArrayList<>();
    for (Card src : sourceCards) {
      Card card = new Card();
      card.setDeck(deck);
      card.setFrontText(src.getFrontText());
      card.setBackText(src.getBackText());
      card.setSortOrder(src.getSortOrder());
      copies.add(card);
    }
    if (!copies.isEmpty()) {
      cardRepository.saveAll(copies);
    }
    return toSummary(deck, copies.size(), null, 0);
  }

  @Transactional(readOnly = true)
  public byte[] exportMineXlsx(Long deckId, UserAccount user) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    List<Card> cards = cardRepository.findByDeckOrderBySortOrderAscIdAsc(deck);
    if (cards.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "내보낼 카드가 없습니다.");
    }
    return xlsxExporter.export(cards);
  }

  @Transactional
  public DeckSummaryResponse renameMine(Long deckId, UserAccount user, String newName) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    String name = resolveDeckName(user, newName, null, deck.getId());
    deck.setName(name);
    deck.setUpdatedAt(Instant.now());
    Integer studyLevels =
        progressRepository
            .findByUserAndDeck(user, deck)
            .filter(
                p ->
                    ProgressActivity.isActive(
                        objectMapper, p.getLevelsJson(), p.getQueueJson()))
            .map(p -> levelCountOf(p.getLevelsJson()))
            .orElse(null);
    return toSummary(deck, cardRepository.countByDeck(deck), studyLevels, clearCountOf(user, deck));
  }

  @Transactional
  public DeckSummaryResponse replaceMineXlsx(Long deckId, UserAccount user, MultipartFile file) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    xlsxImporter.validateUpload(file);
    List<XlsxDeckImporter.ParsedCard> parsed = xlsxImporter.parse(file);
    if (parsed.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "유효한 카드 행이 없습니다. A열=앞면, B열=뒷면을 확인하세요.");
    }

    progressService.clearPlayKeepHistory(user, deck);
    cardRepository.deleteByDeck(deck);
    List<Card> cards = buildCards(deck, parsed);
    cardRepository.saveAll(cards);
    deck.setUpdatedAt(Instant.now());
    return toSummary(deck, cards.size(), null, clearCountOf(user, deck));
  }

  @Transactional
  public CardResponse addCard(Long deckId, UserAccount user, CardUpsertRequest request) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    String front = request.front().trim();
    String back = request.back().trim();
    if (front.isEmpty() || back.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "앞면과 뒷면을 모두 입력하세요.");
    }
    Card card = new Card();
    card.setDeck(deck);
    card.setFrontText(front);
    card.setBackText(back);
    card.setSortOrder(cardRepository.maxSortOrder(deck) + 1);
    cardRepository.save(card);
    deck.setUpdatedAt(Instant.now());
    progressService.clearPlayKeepHistory(user, deck);
    return new CardResponse(card.getId(), card.getFrontText(), card.getBackText(), card.getSortOrder());
  }

  @Transactional
  public CardResponse updateCard(
      Long deckId, Long cardId, UserAccount user, CardUpsertRequest request) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    Card card =
        cardRepository
            .findByIdAndDeck(cardId, deck)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "카드를 찾을 수 없습니다."));
    String front = request.front().trim();
    String back = request.back().trim();
    if (front.isEmpty() || back.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "앞면과 뒷면을 모두 입력하세요.");
    }
    card.setFrontText(front);
    card.setBackText(back);
    deck.setUpdatedAt(Instant.now());
    return new CardResponse(card.getId(), card.getFrontText(), card.getBackText(), card.getSortOrder());
  }

  @Transactional
  public void deleteCard(Long deckId, Long cardId, UserAccount user) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    Card card =
        cardRepository
            .findByIdAndDeck(cardId, deck)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "카드를 찾을 수 없습니다."));
    cardRepository.delete(card);
    deck.setUpdatedAt(Instant.now());
    progressService.clearPlayKeepHistory(user, deck);
  }

  @Transactional
  public void deleteMine(Long deckId, UserAccount user) {
    Deck deck = requireOwnedUserDeck(deckId, user);
    progressRepository.deleteByUserAndDeck(user, deck);
    cardRepository.deleteByDeck(deck);
    deckRepository.delete(deck);
  }

  private Deck requireOwnedUserDeck(Long deckId, UserAccount user) {
    Deck deck =
        deckRepository
            .findById(deckId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "세트를 찾을 수 없습니다."));
    if (deck.getSourceType() == DeckSourceType.BUILTIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "기본 제공 세트는 수정할 수 없습니다.");
    }
    if (deck.getOwner() == null || !deck.getOwner().getId().equals(user.getId())) {
      // Hide other users' decks (same as missing) to avoid IDOR probing.
      throw new ApiException(HttpStatus.NOT_FOUND, "세트를 찾을 수 없습니다.");
    }
    return deck;
  }

  private List<Card> buildCards(Deck deck, List<XlsxDeckImporter.ParsedCard> parsed) {
    int order = 1;
    List<Card> cards = new ArrayList<>();
    for (XlsxDeckImporter.ParsedCard row : parsed) {
      Card card = new Card();
      card.setDeck(deck);
      card.setFrontText(row.front());
      card.setBackText(row.back());
      card.setSortOrder(order++);
      cards.add(card);
    }
    return cards;
  }

  public Deck requireAccessible(Long deckId, UserAccount user) {
    Deck deck =
        deckRepository
            .findById(deckId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "세트를 찾을 수 없습니다."));
    if (deck.getSourceType() == DeckSourceType.BUILTIN) {
      return deck;
    }
    if (deck.getOwner() == null || !deck.getOwner().getId().equals(user.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "이 세트에 접근할 수 없습니다.");
    }
    return deck;
  }

  private DeckSummaryResponse toSummary(
      Deck deck, long cardCount, Integer studyLevels, int clearCount) {
    return new DeckSummaryResponse(
        deck.getId(),
        deck.getName(),
        deck.getSourceType(),
        cardCount,
        studyLevels,
        clearCount,
        deck.getUpdatedAt());
  }

  private int clearCountOf(UserAccount user, Deck deck) {
    return progressRepository
        .findByUserAndDeck(user, deck)
        .map(StudyProgress::getClearCount)
        .orElse(0);
  }

  private String uniqueCopyName(UserAccount user, String sourceName) {
    String base = sourceName == null || sourceName.isBlank() ? "세트" : sourceName.trim();
    for (int n = 1; n < 10_000; n++) {
      String suffix = n == 1 ? " 복사" : " 복사 " + n;
      int maxBase = Math.max(1, 200 - suffix.length());
      String stem = base.length() > maxBase ? base.substring(0, maxBase) : base;
      String candidate = stem + suffix;
      if (!deckRepository.existsByOwnerAndNameIgnoreCase(user, candidate)) {
        return candidate;
      }
    }
    throw new ApiException(HttpStatus.CONFLICT, "같은 이름의 세트가 너무 많아요.");
  }

  private String resolveDeckName(
      UserAccount user, String requested, String filename, Long excludeDeckId) {
    String name =
        (requested == null || requested.isBlank())
            ? stripExtension(filename == null ? "내 세트" : filename)
            : requested.trim();
    if (name.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "세트 이름을 입력하세요.");
    }
    if (name.length() > 200) {
      name = name.substring(0, 200);
    }
    boolean taken =
        excludeDeckId == null
            ? deckRepository.existsByOwnerAndNameIgnoreCase(user, name)
            : deckRepository.existsByOwnerAndNameIgnoreCaseAndIdNot(user, name, excludeDeckId);
    if (taken) {
      throw new ApiException(HttpStatus.CONFLICT, "같은 이름의 세트가 이미 있습니다.");
    }
    return name;
  }

  private String stripExtension(String filename) {
    int idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.substring(0, idx) : filename;
  }

}
