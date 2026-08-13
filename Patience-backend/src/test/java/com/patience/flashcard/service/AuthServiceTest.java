package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.patience.flashcard.domain.EmailChallenge;
import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.EmailChallengeRepository;
import com.patience.flashcard.repository.UserAccountRepository;
import com.patience.flashcard.security.JwtService;
import com.patience.flashcard.security.UserPrincipal;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.LoginRequest;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock UserAccountRepository userRepository;
  @Mock EmailChallengeRepository challenges;
  @Mock PasswordEncoder passwordEncoder;
  @Mock JwtService jwtService;
  @Mock RateLimiter rateLimiter;
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
            rateLimiter,
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
  void emailAvailableIsFormatOnlyAndDoesNotRevealTaken() {
    var result = authService.emailAvailable("A@B.CO", "127.0.0.1");
    assertThat(result.available()).isTrue();
    assertThat(result.email()).isEqualTo("a@b.co");
    assertThat(result.message()).isNull();
    verify(userRepository, never()).existsByEmailIgnoreCase(any());
  }

  @Test
  void requestEmailCodeDoesNotRevealExistingEmail() {
    when(userRepository.existsByEmailIgnoreCase("a@b.co")).thenReturn(true);
    var result = authService.requestEmailCode("A@B.CO", "127.0.0.1");
    assertThat(result.message()).isEqualTo("인증 번호를 보냈어요.");
    verify(mailService, never()).sendSignupCode(any(), any());
    verify(challenges).save(any(EmailChallenge.class));
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
    when(jwtService.createToken(9L, "hyunm", 0)).thenReturn("token");

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
    verify(rateLimiter).assertAllowed(RateLimiter.Action.SIGNUP, "127.0.0.1");
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
  void signupWithoutProofDoesNotRevealTakenEmail() {
    assertThatThrownBy(
            () ->
                authService.signup(
                    new SignupRequest("hyunm", "a@b.co", "password1"),
                    "127.0.0.1",
                    httpRequest,
                    response))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("메일 인증을 먼저")
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    verify(userRepository, never()).existsByEmailIgnoreCase(any());
  }

  @Test
  void confirmWrongCodeLocksAfterFiveFailures() {
    EmailChallenge row = openProof("a@b.co");
    row.setCodeHash(TokenHasher.codeHash("a@b.co", "111111"));
    row.setFailedAttempts(4);
    when(challenges.findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByExpiresAtDesc(
            "a@b.co", EmailChallenge.PURPOSE_SIGNUP))
        .thenReturn(Optional.of(row));

    assertThatThrownBy(
            () -> authService.confirmEmailCode("a@b.co", "000000", "127.0.0.1", response))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("너무 틀렸어요");
    verify(challenges).delete(row);
  }

  @Test
  void loginLooksUpByEmailNotNickname() {
    UserAccount user = new UserAccount();
    ReflectionTestUtils.setField(user, "id", 1L);
    user.setUsername("hyunm");
    user.setEmail("a@b.co");
    user.setPasswordHash("hash");
    when(userRepository.findByEmailIgnoreCase("a@b.co")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password1", "hash")).thenReturn(true);
    when(jwtService.cookieName()).thenReturn("PATIENCE_TOKEN");
    when(jwtService.cookieSecure()).thenReturn(false);
    when(jwtService.expirationMs()).thenReturn(86_400_000L);
    when(jwtService.createToken(1L, "hyunm", 0)).thenReturn("token");

    var me = authService.login(new LoginRequest("A@B.CO", "password1"), "127.0.0.1", response);

    assertThat(me.username()).isEqualTo("hyunm");
    assertThat(me.email()).isEqualTo("a@b.co");
    verify(rateLimiter).assertAllowed(RateLimiter.Action.LOGIN, "127.0.0.1");
  }

  @Test
  void requestPasswordResetDoesNotRevealMissingEmail() {
    when(userRepository.findByEmailIgnoreCase("a@b.co")).thenReturn(Optional.empty());

    var result = authService.requestPasswordReset("A@B.CO", "127.0.0.1");

    assertThat(result.message()).isEqualTo("인증 번호를 보냈어요.");
    verify(mailService, never()).sendResetCode(any(), any());
    verify(challenges).save(any(EmailChallenge.class));
  }

  @Test
  void requestPasswordResetSendsCodeWhenUserExists() {
    when(userRepository.findByEmailIgnoreCase("a@b.co")).thenReturn(Optional.of(new UserAccount()));

    var result = authService.requestPasswordReset("a@b.co", "127.0.0.1");

    assertThat(result.message()).isEqualTo("인증 번호를 보냈어요.");
    verify(challenges).deleteOpen("a@b.co", EmailChallenge.PURPOSE_RESET);
    verify(mailService).sendResetCode(eq("a@b.co"), any());
  }

  @Test
  void resetPasswordUpdatesHash() {
    EmailChallenge row = new EmailChallenge();
    row.setEmail("a@b.co");
    row.setPurpose(EmailChallenge.PURPOSE_RESET);
    row.setCodeHash(TokenHasher.codeHash("a@b.co", "123456"));
    row.setExpiresAt(Instant.now().plusSeconds(600));
    UserAccount user = new UserAccount();
    user.setPasswordHash("old");
    when(challenges.findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByExpiresAtDesc(
            "a@b.co", EmailChallenge.PURPOSE_RESET))
        .thenReturn(Optional.of(row));
    when(userRepository.findByEmailIgnoreCase("a@b.co")).thenReturn(Optional.of(user));
    when(passwordEncoder.encode("newpass12")).thenReturn("new-hash");

    var result = authService.resetPassword("a@b.co", "123456", "newpass12", "127.0.0.1");

    assertThat(result.message()).contains("바꿨어요");
    assertThat(user.getPasswordHash()).isEqualTo("new-hash");
    assertThat(row.getConsumedAt()).isNotNull();
  }

  @Test
  void signupRejectsMissingProof() {
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
    verify(userRepository, never()).existsByEmailIgnoreCase(any());
  }

  @Test
  void logoutBumpsSessionVersionWhenAuthenticated() {
    UserAccount user = new UserAccount();
    ReflectionTestUtils.setField(user, "id", 3L);
    user.setUsername("hyunm");
    user.setSessionVersion(2);
    when(userRepository.findById(3L)).thenReturn(Optional.of(user));
    when(jwtService.cookieName()).thenReturn("PATIENCE_TOKEN");
    when(jwtService.cookieSecure()).thenReturn(false);

    var auth =
        new UsernamePasswordAuthenticationToken(new UserPrincipal(user), null, java.util.List.of());
    authService.logout(auth, response);

    assertThat(user.getSessionVersion()).isEqualTo(3);
    verify(userRepository).save(user);
  }

  @Test
  void logoutWithoutAuthOnlyClearsCookie() {
    when(jwtService.cookieName()).thenReturn("PATIENCE_TOKEN");
    when(jwtService.cookieSecure()).thenReturn(false);

    authService.logout(null, response);

    verify(userRepository, never()).save(any());
  }

  private static EmailChallenge openProof(String email) {
    EmailChallenge proof = new EmailChallenge();
    proof.setEmail(email);
    proof.setConfirmedAt(Instant.now());
    proof.setExpiresAt(Instant.now().plusSeconds(600));
    return proof;
  }
}
