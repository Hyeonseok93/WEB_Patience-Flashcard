package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.patience.flashcard.domain.EmailChallenge;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.EmailChallengeRepository;
import com.patience.flashcard.repository.UserAccountRepository;
import com.patience.flashcard.security.JwtService;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UsernameAvailableResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock UserAccountRepository userRepository;
  @Mock EmailChallengeRepository challenges;
  @Mock PasswordEncoder passwordEncoder;
  @Mock JwtService jwtService;
  @Mock SignupRateLimiter signupRateLimiter;
  @Mock LoginRateLimiter loginRateLimiter;
  @Mock VerificationRateLimiter verificationRateLimiter;
  @Mock ConfirmRateLimiter confirmRateLimiter;
  @Mock LookupRateLimiter lookupRateLimiter;
  @Mock MailService mailService;
  @Mock HttpServletRequest httpRequest;
  @Mock HttpServletResponse response;

  AuthService authService;

  @BeforeEach
  void setUp() {
    authService =
        new AuthService(
            userRepository,
            challenges,
            passwordEncoder,
            jwtService,
            signupRateLimiter,
            loginRateLimiter,
            verificationRateLimiter,
            confirmRateLimiter,
            lookupRateLimiter,
            mailService);
  }

  @Test
  void usernameAvailableRejectsReservedWithoutHittingDb() {
    UsernameAvailableResponse result = authService.usernameAvailable("Admin", "127.0.0.1");
    assertThat(result.available()).isFalse();
    assertThat(result.username()).isEqualTo("admin");
    verify(userRepository, never()).existsByUsernameIgnoreCase(any());
  }

  @Test
  void usernameAvailableReportsTaken() {
    when(userRepository.existsByUsernameIgnoreCase("hyunm")).thenReturn(true);
    UsernameAvailableResponse result = authService.usernameAvailable("Hyunm", "127.0.0.1");
    assertThat(result.available()).isFalse();
    assertThat(result.message()).isEqualTo("이미 있어요");
  }

  @Test
  void emailAvailableDoesNotRevealTaken() {
    var result = authService.emailAvailable("A@B.CO", "127.0.0.1");
    assertThat(result.available()).isTrue();
    assertThat(result.message()).isEqualTo("쓸 수 있어요");
    verify(userRepository, never()).existsByEmailIgnoreCase(any());
  }

  @Test
  void requestEmailCodeRejectsExistingEmail() {
    when(userRepository.existsByEmailIgnoreCase("a@b.co")).thenReturn(true);
    assertThatThrownBy(() -> authService.requestEmailCode("A@B.CO", "127.0.0.1"))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("이미 존재하는 이메일")
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.CONFLICT);
    verify(mailService, never()).sendSignupCode(any(), any());
  }

  @Test
  void signupStoresLowercaseNicknameAndEmailAfterProof() {
    EmailChallenge proof = openProof("a@b.co");
    when(httpRequest.getCookies())
        .thenReturn(new Cookie[] {new Cookie(AuthService.EMAIL_PROOF_COOKIE, "proof-token")});
    when(userRepository.existsByUsernameIgnoreCase("hyunm")).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase("a@b.co")).thenReturn(false);
    when(challenges.findByProofHashAndConsumedAtIsNull(any())).thenReturn(Optional.of(proof));
    when(passwordEncoder.encode("password1")).thenReturn("hash");
    when(userRepository.saveAndFlush(any(UserAccount.class)))
        .thenAnswer(
            inv -> {
              UserAccount user = inv.getArgument(0);
              ReflectionTestUtils.setField(user, "id", 9L);
              return user;
            });
    when(jwtService.cookieName()).thenReturn("PATIENCE_TOKEN");
    when(jwtService.cookieSecure()).thenReturn(false);
    when(jwtService.expirationMs()).thenReturn(86_400_000L);
    when(jwtService.createToken(9L, "hyunm")).thenReturn("token");

    var created =
        authService.signup(
            new SignupRequest("HyunM", "A@B.CO", "password1"),
            "127.0.0.1",
            httpRequest,
            response);

    assertThat(created.username()).isEqualTo("hyunm");
    assertThat(created.email()).isEqualTo("a@b.co");
    assertThat(proof.getConsumedAt()).isNotNull();
    verify(mailService, never()).sendSignupCode(any(), any());
    verify(signupRateLimiter).assertAllowed("127.0.0.1");
  }

  @Test
  void signupRejectsReserved() {
    assertThatThrownBy(
            () ->
                authService.signup(
                    new SignupRequest("admin", "a@b.co", "password1"),
                    "127.0.0.1",
                    httpRequest,
                    response))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    verify(userRepository, never()).saveAndFlush(any());
  }

  @Test
  void signupRejectsDuplicateEmail() {
    when(userRepository.existsByEmailIgnoreCase("a@b.co")).thenReturn(true);
    assertThatThrownBy(
            () ->
                authService.signup(
                    new SignupRequest("hyunm", "a@b.co", "password1"),
                    "127.0.0.1",
                    httpRequest,
                    response))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("이미 존재하는 이메일");
  }

  @Test
  void confirmWrongCodeLocksAfterFiveFailures() {
    EmailChallenge row = openProof("a@b.co");
    row.setCodeHash(TokenHasher.codeHash("a@b.co", "111111"));
    row.setFailedAttempts(4);
    when(challenges.findFirstByEmailAndConsumedAtIsNullOrderByExpiresAtDesc("a@b.co"))
        .thenReturn(Optional.of(row));

    assertThatThrownBy(
            () -> authService.confirmEmailCode("a@b.co", "000000", "127.0.0.1", response))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("너무 틀렸어요");
    verify(challenges).delete(row);
  }

  @Test
  void signupRejectsMissingProof() {
    when(userRepository.existsByEmailIgnoreCase("a@b.co")).thenReturn(false);
    when(httpRequest.getCookies()).thenReturn(null);
    assertThatThrownBy(
            () ->
                authService.signup(
                    new SignupRequest("hyunm", "a@b.co", "password1"),
                    "127.0.0.1",
                    httpRequest,
                    response))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("메일 인증");
  }

  private static EmailChallenge openProof(String email) {
    EmailChallenge proof = new EmailChallenge();
    proof.setEmail(email);
    proof.setConfirmedAt(Instant.now());
    proof.setExpiresAt(Instant.now().plusSeconds(600));
    return proof;
  }
}
