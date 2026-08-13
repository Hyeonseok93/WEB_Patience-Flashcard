package com.patience.flashcard.service;

import com.patience.flashcard.domain.EmailChallenge;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.EmailChallengeRepository;
import com.patience.flashcard.repository.UserAccountRepository;
import com.patience.flashcard.security.JwtService;
import com.patience.flashcard.security.UserPrincipal;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.EmailAvailableResponse;
import com.patience.flashcard.web.dto.LoginRequest;
import com.patience.flashcard.web.dto.MessageResponse;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UserResponse;
import com.patience.flashcard.web.dto.UsernameAvailableResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  static final String EMAIL_PROOF_COOKIE = "PATIENCE_EMAIL_PROOF";
  static final int MAX_CONFIRM_FAILURES = 5;
  private static final Duration CODE_TTL = Duration.ofMinutes(10);
  /** Fixed bcrypt so missing-user logins pay the same cost as wrong-password. */
  private static final String DUMMY_PASSWORD_HASH =
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

  private final UserAccountRepository userRepository;
  private final EmailChallengeRepository challenges;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final RateLimiter rateLimiter;
  private final MailService mailService;

  public AuthService(
      UserAccountRepository userRepository,
      EmailChallengeRepository challenges,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      RateLimiter rateLimiter,
      MailService mailService) {
    this.userRepository = userRepository;
    this.challenges = challenges;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.rateLimiter = rateLimiter;
    this.mailService = mailService;
  }

  @Transactional(readOnly = true)
  public UsernameAvailableResponse usernameAvailable(String raw, String clientIp) {
    rateLimiter.assertAllowed(RateLimiter.Action.LOOKUP, clientIp);
    String username = UsernameRules.normalize(raw);
    String invalid = UsernameRules.invalidReason(username);
    if (invalid != null) {
      return new UsernameAvailableResponse(username, false, invalid);
    }
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      return new UsernameAvailableResponse(username, false, "이미 있어요");
    }
    return new UsernameAvailableResponse(username, true, "쓸 수 있어요");
  }

  @Transactional(readOnly = true)
  public EmailAvailableResponse emailAvailable(String raw, String clientIp) {
    rateLimiter.assertAllowed(RateLimiter.Action.LOOKUP, clientIp);
    String email = EmailRules.normalize(raw);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      return new EmailAvailableResponse(email, false, invalid);
    }
    // Format only — do not query users (email enumeration).
    return new EmailAvailableResponse(email, true, null);
  }

  @Transactional
  public MessageResponse requestEmailCode(String rawEmail, String clientIp) {
    String email = EmailRules.normalize(rawEmail);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    rateLimiter.assertAllowed(RateLimiter.Action.VERIFICATION, clientIp);
    boolean taken = userRepository.existsByEmailIgnoreCase(email);
    challenges.deleteOpen(email, EmailChallenge.PURPOSE_SIGNUP);
    // Always persist a challenge so confirm errors match (no “먼저 인증하기” oracle).
    EmailChallenge row = newChallenge(email, EmailChallenge.PURPOSE_SIGNUP);
    if (taken) {
      row.setCodeHash(unreachableCodeHash());
      challenges.save(row);
    } else {
      String code = TokenHasher.sixDigits();
      row.setCodeHash(TokenHasher.codeHash(email, code));
      challenges.save(row);
      try {
        mailService.sendSignupCode(email, code);
      } catch (Exception ex) {
        // Same body as taken/success — SMTP failure must not probe registration.
      }
    }
    return new MessageResponse("인증 번호를 보냈어요.");
  }

  @Transactional(noRollbackFor = ApiException.class)
  public MessageResponse confirmEmailCode(
      String rawEmail, String code, String clientIp, HttpServletResponse response) {
    String email = EmailRules.normalize(rawEmail);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    if (code == null || !code.matches("^\\d{6}$")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호 6자리를 입력해 주세요.");
    }
    rateLimiter.assertAllowed(RateLimiter.Action.CONFIRM, clientIp + ":" + email);
    EmailChallenge row =
        challenges
            .findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByExpiresAtDesc(
                email, EmailChallenge.PURPOSE_SIGNUP)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "먼저 인증하기를 눌러 주세요."));
    if (row.getExpiresAt().isBefore(Instant.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 만료됐어요. 다시 보내 주세요.");
    }
    if (!TokenHasher.codeHash(email, code).equals(row.getCodeHash())) {
      int failures = row.getFailedAttempts() + 1;
      row.setFailedAttempts(failures);
      if (failures >= MAX_CONFIRM_FAILURES) {
        challenges.delete(row);
        throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 너무 틀렸어요. 다시 보내 주세요.");
      }
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 달라요.");
    }
    String proof = TokenHasher.newRawToken();
    Instant proofExpires = Instant.now().plus(CODE_TTL);
    row.setConfirmedAt(Instant.now());
    row.setExpiresAt(proofExpires);
    row.setProofHash(TokenHasher.sha256(proof));
    row.setFailedAttempts(0);
    writeCookie(response, EMAIL_PROOF_COOKIE, proof, CODE_TTL.toSeconds());
    return new MessageResponse("인증 완료");
  }

  @Transactional
  public UserResponse signup(
      SignupRequest request,
      String clientIp,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    rateLimiter.assertAllowed(RateLimiter.Action.SIGNUP, clientIp);
    String username = UsernameRules.normalize(request.username());
    String invalidName = UsernameRules.invalidReason(username);
    if (invalidName != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalidName);
    }
    String email = EmailRules.normalize(request.email());
    String invalidEmail = EmailRules.invalidReason(email);
    if (invalidEmail != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalidEmail);
    }
    // Proof before existence check — otherwise 409 vs 400 oracles registration.
    String rawProof = cookieValue(httpRequest, EMAIL_PROOF_COOKIE);
    if (rawProof == null || rawProof.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 먼저 해 주세요.");
    }
    EmailChallenge proof =
        challenges
            .findByProofHashAndConsumedAtIsNull(TokenHasher.sha256(rawProof))
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 먼저 해 주세요."));
    if (!email.equals(proof.getEmail()) || proof.getConfirmedAt() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 먼저 해 주세요.");
    }
    if (proof.getExpiresAt().isBefore(Instant.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증이 만료됐어요. 다시 해 주세요.");
    }
    if (userRepository.existsByEmailIgnoreCase(email)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 다시 해 주세요.");
    }
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      throw new ApiException(HttpStatus.CONFLICT, "이미 있는 닉네임이에요");
    }
    UserAccount user = new UserAccount();
    user.setUsername(username);
    user.setEmail(email);
    user.setEmailVerifiedAt(Instant.now());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    try {
      userRepository.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      throw conflictFrom(ex);
    }
    proof.setConsumedAt(Instant.now());
    clearCookie(response, EMAIL_PROOF_COOKIE);
    writeAuthCookie(response, user);
    return toResponse(user);
  }

  @Transactional(readOnly = true)
  public UserResponse login(LoginRequest request, String clientIp, HttpServletResponse response) {
    rateLimiter.assertAllowed(RateLimiter.Action.LOGIN, clientIp);
    String email = EmailRules.normalize(request.email());
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new BadCredentialsException("bad credentials");
    }
    Optional<UserAccount> found = userRepository.findByEmailIgnoreCase(email);
    // Always run bcrypt so missing emails are not faster than wrong passwords.
    String hash = found.map(UserAccount::getPasswordHash).orElse(DUMMY_PASSWORD_HASH);
    if (!passwordEncoder.matches(request.password(), hash) || found.isEmpty()) {
      throw new BadCredentialsException("bad credentials");
    }
    UserAccount user = found.get();
    writeAuthCookie(response, user);
    return toResponse(user);
  }

  @Transactional
  public MessageResponse requestPasswordReset(String rawEmail, String clientIp) {
    String email = EmailRules.normalize(rawEmail);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    rateLimiter.assertAllowed(RateLimiter.Action.VERIFICATION, clientIp);
    Optional<UserAccount> user = userRepository.findByEmailIgnoreCase(email);
    challenges.deleteOpen(email, EmailChallenge.PURPOSE_RESET);
    EmailChallenge row = newChallenge(email, EmailChallenge.PURPOSE_RESET);
    if (user.isPresent()) {
      String code = TokenHasher.sixDigits();
      row.setCodeHash(TokenHasher.codeHash(email, code));
      challenges.save(row);
      try {
        mailService.sendResetCode(email, code);
      } catch (Exception ex) {
        // Same body as success so a broken mailbox cannot probe account existence.
      }
    } else {
      row.setCodeHash(unreachableCodeHash());
      challenges.save(row);
    }
    return new MessageResponse("인증 번호를 보냈어요.");
  }

  @Transactional(noRollbackFor = ApiException.class)
  public MessageResponse resetPassword(String rawEmail, String code, String newPassword, String clientIp) {
    String email = EmailRules.normalize(rawEmail);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    if (code == null || !code.matches("^\\d{6}$")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호 6자리를 입력해 주세요.");
    }
    rateLimiter.assertAllowed(RateLimiter.Action.CONFIRM, clientIp + ":reset:" + email);
    EmailChallenge row =
        challenges
            .findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByExpiresAtDesc(
                email, EmailChallenge.PURPOSE_RESET)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "먼저 인증하기를 눌러 주세요."));
    if (row.getExpiresAt().isBefore(Instant.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 만료됐어요. 다시 보내 주세요.");
    }
    if (!TokenHasher.codeHash(email, code).equals(row.getCodeHash())) {
      int failures = row.getFailedAttempts() + 1;
      row.setFailedAttempts(failures);
      if (failures >= MAX_CONFIRM_FAILURES) {
        challenges.delete(row);
        throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 너무 틀렸어요. 다시 보내 주세요.");
      }
      throw new ApiException(HttpStatus.BAD_REQUEST, "인증 번호가 달라요.");
    }
    UserAccount user =
        userRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 다시 해 주세요."));
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setSessionVersion(user.getSessionVersion() + 1);
    row.setConfirmedAt(Instant.now());
    row.setConsumedAt(Instant.now());
    return new MessageResponse("비밀번호를 바꿨어요. 다시 로그인해 주세요.");
  }

  @Transactional
  public void logout(Authentication authentication, HttpServletResponse response) {
    if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
      userRepository
          .findById(principal.getId())
          .ifPresent(
              user -> {
                user.setSessionVersion(user.getSessionVersion() + 1);
                userRepository.save(user);
              });
    }
    clearAuthCookie(response);
  }

  @Transactional(readOnly = true)
  public UserResponse me(Authentication authentication) {
    UserPrincipal principal = requirePrincipal(authentication);
    UserAccount user =
        userRepository
            .findById(principal.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
    return toResponse(user);
  }

  public UserAccount requireUser(Authentication authentication) {
    UserPrincipal principal = requirePrincipal(authentication);
    return userRepository.getReferenceById(principal.getId());
  }

  private EmailChallenge newChallenge(String email, String purpose) {
    EmailChallenge row = new EmailChallenge();
    row.setEmail(email);
    row.setPurpose(purpose);
    row.setExpiresAt(Instant.now().plus(CODE_TTL));
    return row;
  }

  /** Hash that no 6-digit OTP can match — used for decoy challenges. */
  private static String unreachableCodeHash() {
    return TokenHasher.sha256(TokenHasher.newRawToken());
  }

  private UserPrincipal requirePrincipal(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    return principal;
  }

  private void writeAuthCookie(HttpServletResponse response, UserAccount user) {
    String token =
        jwtService.createToken(user.getId(), user.getUsername(), user.getSessionVersion());
    writeCookie(response, jwtService.cookieName(), token, jwtService.expirationMs() / 1000);
  }

  private void clearAuthCookie(HttpServletResponse response) {
    writeCookie(response, jwtService.cookieName(), "", 0);
  }

  private void writeCookie(HttpServletResponse response, String name, String value, long maxAgeSeconds) {
    ResponseCookie cookie =
        ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(jwtService.cookieSecure())
            .path("/")
            .sameSite("Lax")
            .maxAge(maxAgeSeconds)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private void clearCookie(HttpServletResponse response, String name) {
    writeCookie(response, name, "", 0);
  }

  private static String cookieValue(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    for (Cookie cookie : cookies) {
      if (name.equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    return null;
  }

  private UserResponse toResponse(UserAccount user) {
    return new UserResponse(user.getId(), user.getUsername(), user.getEmail());
  }

  private static ApiException conflictFrom(DataIntegrityViolationException ex) {
    String msg =
        String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase(Locale.ROOT);
    if (msg.contains("email")) {
      // Race after proof — do not say the address is taken.
      return new ApiException(HttpStatus.BAD_REQUEST, "메일 인증을 다시 해 주세요.");
    }
    return new ApiException(HttpStatus.CONFLICT, "이미 있는 닉네임이에요");
  }
}
