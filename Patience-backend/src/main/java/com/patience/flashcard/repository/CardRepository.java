package com.patience.flashcard.repository;

import com.patience.flashcard.domain.Card;
import com.patience.flashcard.domain.Deck;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CardRepository extends JpaRepository<Card, Long> {
  List<Card> findByDeckOrderBySortOrderAscIdAsc(Deck deck);

  long countByDeck(Deck deck);

  /** One grouped query for many decks, replacing a per-deck count (N+1). */
  @Query("select c.deck.id, count(c) from Card c where c.deck in :decks group by c.deck.id")
  List<Object[]> countByDecks(@Param("decks") Collection<Deck> decks);

  @Query("select c.id from Card c where c.deck = :deck")
  List<Long> findIdsByDeck(@Param("deck") Deck deck);

  Optional<Card> findByIdAndDeck(Long id, Deck deck);

  boolean existsByDeckAndFrontTextIgnoreCase(Deck deck, String frontText);

  boolean existsByDeckAndFrontTextIgnoreCaseAndIdNot(Deck deck, String frontText, Long id);

  @Query("select coalesce(max(c.sortOrder), 0) from Card c where c.deck = :deck")
  int maxSortOrder(@Param("deck") Deck deck);

  void deleteByDeck(Deck deck);
}
