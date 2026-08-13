package com.patience.flashcard.repository;

import com.patience.flashcard.domain.UserAccount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByEmailIgnoreCase(String email);

  Optional<UserAccount> findByEmailIgnoreCase(String email);
}
