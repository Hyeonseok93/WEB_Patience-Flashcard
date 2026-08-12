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

  private final UserAccountRepository userRepository;
  private final EmailChallengeRepository challenges;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final SignupRateLimiter signupRateLimiter;
  private final LoginRateLimiter loginRateLimiter;
  private final VerificationRateLimiter verificationRateLimiter;
  private final ConfirmRateLimiter confirmRateLimiter;
  private final LookupRateLimiter lookupRateLimiter;
  private final MailService mailService;

  public AuthService(
      UserAccountRepository userRepository,
      EmailChallengeRepository challenges,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      SignupRateLimiter signupRateLimiter,
      LoginRateLimiter loginRateLimiter,
      VerificationRateLimiter verificationRateLimiter,
      ConfirmRateLimiter confirmRateLimiter,
      LookupRateLimiter lookupRateLimiter,
      MailService mailService) {
    this.userRepository = userRepository;
    this.challenges = challenges;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.signupRateLimiter = signupRateLimiter;
    this.loginRateLimiter = loginRateLimiter;
    this.verificationRateLimiter = verificationRateLimiter;
    this.confirmRateLimiter = confirmRateLimiter;
    this.lookupRateLimiter = lookupRateLimiter;
    this.mailService = mailService;
  }

  @Transactional(readOnly = true)
  public UsernameAvailableResponse usernameAvailable(String raw, String clientIp) {
    lookupRateLimiter.assertAllowed(clientIp);
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
    lookupRateLimiter.assertAllowed(clientIp);
    String email = EmailRules.normalize(raw);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      return new EmailAvailableResponse(email, false, invalid);
    }
    return new EmailAvailableResponse(email, true, "쓸 수 있어요");
  }

  @Transactional
  public MessageResponse requestEmailCode(String rawEmail, String clientIp) {
    String email = requireFreshEmail(rawEmail);
    verificationRateLimiter.assertAllowed(clientIp + ":" + email);
    challenges.deleteOpen(email, EmailChallenge.PURPOSE_SIGNUP);
    String code = TokenHasher.sixDigits();
    EmailChallenge row = new EmailChallenge();
    row.setEmail(email);
    row.setPurpose(EmailChallenge.PURPOSE_SIGNUP);
    row.setCodeHash(TokenHasher.codeHash(email, code));
    row.setExpiresAt(Instant.now().plus(CODE_TTL));
    challenges.save(row);
    try {
      mailService.sendSignupCode(email, code);
    } catch (Exception ex) {
      throw new ApiException(HttpStatus.BAD_GATEWAY, "인증 메일을 보내지 못했어요. 잠시 후 다시 해 주세요.");
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
    confirmRateLimiter.assertAllowed(clientIp + ":" + email);
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
    row.setConfirmedAt(Instant.now());
    row.setProofHash(TokenHasher.sha256(proof));
    writeCookie(response, EMAIL_PROOF_COOKIE, proof, CODE_TTL.toSeconds());
    return new MessageResponse("인증 완료");
  }

  @Transactional
  public UserResponse signup(
      SignupRequest request,
      String clientIp,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    signupRateLimiter.assertAllowed(clientIp);
    String username = UsernameRules.normalize(request.username());
    String invalidName = UsernameRules.invalidReason(username);
    if (invalidName != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalidName);
    }
    String email = requireFreshEmail(request.email());
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
    loginRateLimiter.assertAllowed(clientIp);
    String email = EmailRules.normalize(request.email());
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new BadCredentialsException("bad credentials");
    }
    UserAccount user =
        userRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new BadCredentialsException("bad credentials"));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new BadCredentialsException("bad credentials");
    }
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
    verificationRateLimiter.assertAllowed(clientIp + ":reset:" + email);
    Optional<UserAccount> user = userRepository.findByEmailIgnoreCase(email);
    if (user.isPresent()) {
      challenges.deleteOpen(email, EmailChallenge.PURPOSE_RESET);
      String code = TokenHasher.sixDigits();
      EmailChallenge row = new EmailChallenge();
      row.setEmail(email);
      row.setPurpose(EmailChallenge.PURPOSE_RESET);
      row.setCodeHash(TokenHasher.codeHash(email, code));
      row.setExpiresAt(Instant.now().plus(CODE_TTL));
      challenges.save(row);
      try {
        mailService.sendResetCode(email, code);
      } catch (Exception ex) {
        throw new ApiException(HttpStatus.BAD_GATEWAY, "인증 메일을 보내지 못했어요. 잠시 후 다시 해 주세요.");
      }
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
    confirmRateLimiter.assertAllowed(clientIp + ":reset:" + email);
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
    row.setConfirmedAt(Instant.now());
    row.setConsumedAt(Instant.now());
    return new MessageResponse("비밀번호를 바꿨어요. 다시 로그인해 주세요.");
  }

  public void logout(HttpServletResponse response) {
    ResponseCookie cookie =
        ResponseCookie.from(jwtService.cookieName(), "")
            .httpOnly(true)
            .secure(jwtService.cookieSecure())
            .path("/")
            .sameSite("Lax")
            .maxAge(0)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
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

  private String requireFreshEmail(String raw) {
    String email = EmailRules.normalize(raw);
    String invalid = EmailRules.invalidReason(email);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    if (userRepository.existsByEmailIgnoreCase(email)) {
      throw new ApiException(HttpStatus.CONFLICT, "이미 존재하는 이메일");
    }
    return email;
  }

  private UserPrincipal requirePrincipal(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    return principal;
  }

  private void writeAuthCookie(HttpServletResponse response, UserAccount user) {
    String token = jwtService.createToken(user.getId(), user.getUsername());
    writeCookie(response, jwtService.cookieName(), token, jwtService.expirationMs() / 1000);
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
    // 공개 후 미인증 계정 허용 시: user.isEmailVerified() 다시 포함.
  }

  private static ApiException conflictFrom(DataIntegrityViolationException ex) {
    String msg =
        String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase(Locale.ROOT);
    if (msg.contains("email")) {
      return new ApiException(HttpStatus.CONFLICT, "이미 존재하는 이메일");
    }
    return new ApiException(HttpStatus.CONFLICT, "이미 있는 닉네임이에요");
  }
}
