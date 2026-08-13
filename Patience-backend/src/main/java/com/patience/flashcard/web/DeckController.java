package com.patience.flashcard.web;

import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.service.AuthService;
import com.patience.flashcard.service.DeckService;
import com.patience.flashcard.web.dto.CardResponse;
import com.patience.flashcard.web.dto.CardUpsertRequest;
import com.patience.flashcard.web.dto.CreateDeckRequest;
import com.patience.flashcard.web.dto.DeckDetailResponse;
import com.patience.flashcard.web.dto.DeckSummaryResponse;
import com.patience.flashcard.web.dto.RenameDeckRequest;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

  private final DeckService deckService;
  private final AuthService authService;

  public DeckController(DeckService deckService, AuthService authService) {
    this.deckService = deckService;
    this.authService = authService;
  }

  @GetMapping("/builtin")
  public List<DeckSummaryResponse> builtin(Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.listBuiltin(user);
  }

  @GetMapping("/mine")
  public List<DeckSummaryResponse> mine(Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.listMine(user);
  }

  @GetMapping("/{deckId}")
  public DeckDetailResponse detail(@PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.getAccessibleDeck(deckId, user);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DeckSummaryResponse createEmpty(
      Authentication authentication, @Valid @RequestBody CreateDeckRequest request) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.createEmpty(user, request.name());
  }

  @PostMapping("/{deckId}/copy")
  @ResponseStatus(HttpStatus.CREATED)
  public DeckSummaryResponse copy(
      @PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.copyAccessible(deckId, user);
  }

  @GetMapping("/{deckId}/export")
  public ResponseEntity<byte[]> export(
      @PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    byte[] body = deckService.exportMineXlsx(deckId, user);
    String filename = "patience-deck-" + deckId + ".xlsx";
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build()
                .toString())
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(body);
  }

  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public DeckSummaryResponse importDeck(
      Authentication authentication,
      @RequestParam(value = "name", required = false) String name,
      @RequestParam("file") MultipartFile file) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.importXlsx(user, name, file);
  }

  @PutMapping("/{deckId}/name")
  public DeckSummaryResponse rename(
      @PathVariable Long deckId,
      Authentication authentication,
      @Valid @RequestBody RenameDeckRequest request) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.renameMine(deckId, user, request.name());
  }

  @PutMapping(value = "/{deckId}/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public DeckSummaryResponse replaceImport(
      @PathVariable Long deckId,
      Authentication authentication,
      @RequestParam("file") MultipartFile file) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.replaceMineXlsx(deckId, user, file);
  }

  @PostMapping("/{deckId}/cards")
  @ResponseStatus(HttpStatus.CREATED)
  public CardResponse addCard(
      @PathVariable Long deckId,
      Authentication authentication,
      @Valid @RequestBody CardUpsertRequest request) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.addCard(deckId, user, request);
  }

  @PutMapping("/{deckId}/cards/{cardId}")
  public CardResponse updateCard(
      @PathVariable Long deckId,
      @PathVariable Long cardId,
      Authentication authentication,
      @Valid @RequestBody CardUpsertRequest request) {
    UserAccount user = authService.requireUser(authentication);
    return deckService.updateCard(deckId, cardId, user, request);
  }

  @DeleteMapping("/{deckId}/cards/{cardId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCard(
      @PathVariable Long deckId, @PathVariable Long cardId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    deckService.deleteCard(deckId, cardId, user);
  }

  @DeleteMapping("/{deckId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long deckId, Authentication authentication) {
    UserAccount user = authService.requireUser(authentication);
    deckService.deleteMine(deckId, user);
  }
}
