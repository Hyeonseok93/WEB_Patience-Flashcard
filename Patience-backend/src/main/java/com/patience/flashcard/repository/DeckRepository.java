package com.patience.flashcard.repository;

import com.patience.flashcard.domain.Deck;
import com.patience.flashcard.domain.DeckSourceType;
import com.patience.flashcard.domain.UserAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeckRepository extends JpaRepository<Deck, Long> {
  List<Deck> findBySourceTypeOrderBySortOrderAscNameAsc(DeckSourceType sourceType);

  List<Deck> findByOwnerAndSourceTypeOrderByUpdatedAtDesc(
      UserAccount owner, DeckSourceType sourceType);

  Optional<Deck> findByIdAndOwner(Long id, UserAccount owner);

  boolean existsByOwnerAndNameIgnoreCase(UserAccount owner, String name);

  boolean existsByOwnerAndNameIgnoreCaseAndIdNot(UserAccount owner, String name, Long id);
}
