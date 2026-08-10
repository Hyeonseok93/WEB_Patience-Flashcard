package com.patience.flashcard.web;

import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.service.AuthService;
import com.patience.flashcard.service.ProgressService;
import com.patience.flashcard.web.dto.ProgressResponse;
import com.patience.flashcard.web.dto.ProgressUpsertRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/decks/{deckId}/progress")
public class ProgressController {

  private final ProgressService progressService;
  private final AuthService authService;

  public ProgressController(ProgressService progressService, AuthService authService) {
    this.progressService = progressService;
    this.authService = authService;
  }

  @GetMapping
  public ProgressResponse get(@PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return progressService.get(user, deckId);
  }

  @PutMapping
  public ProgressResponse save(
      @PathVariable Long deckId,
      @Valid @RequestBody ProgressUpsertRequest request,
      Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return progressService.save(user, deckId, request);
  }

  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void reset(@PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    progressService.reset(user, deckId);
  }
}
