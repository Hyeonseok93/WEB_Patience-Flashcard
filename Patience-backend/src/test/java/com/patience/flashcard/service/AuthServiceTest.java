package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.UserAccountRepository;
import com.patience.flashcard.security.JwtService;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UsernameAvailableResponse;
import jakarta.servlet.http.HttpServletResponse;
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
  @Mock PasswordEncoder passwordEncoder;
  @Mock JwtService jwtService;
  @Mock SignupRateLimiter signupRateLimiter;
  @Mock HttpServletResponse response;

  AuthService authService;

  @BeforeEach
  void setUp() {
    authService = new AuthService(userRepository, passwordEncoder, jwtService, signupRateLimiter);
  }

  @Test
  void usernameAvailableRejectsReservedWithoutHittingDb() {
    UsernameAvailableResponse result = authService.usernameAvailable("Admin");
    assertThat(result.available()).isFalse();
    assertThat(result.username()).isEqualTo("admin");
    verify(userRepository, never()).existsByUsernameIgnoreCase(any());
  }

  @Test
  void usernameAvailableReportsTaken() {
    when(userRepository.existsByUsernameIgnoreCase("hyunm")).thenReturn(true);
    UsernameAvailableResponse result = authService.usernameAvailable("Hyunm");
    assertThat(result.available()).isFalse();
    assertThat(result.message()).isEqualTo("이미 있어요");
  }

  @Test
  void signupStoresLowercaseUsername() {
    when(userRepository.existsByUsernameIgnoreCase("hyunm")).thenReturn(false);
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

    var created = authService.signup(new SignupRequest("HyunM", "password1"), "127.0.0.1", response);

    assertThat(created.username()).isEqualTo("hyunm");
    verify(signupRateLimiter).assertAllowed("127.0.0.1");
  }

  @Test
  void signupRejectsReserved() {
    assertThatThrownBy(
            () -> authService.signup(new SignupRequest("admin", "password1"), "127.0.0.1", response))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    verify(userRepository, never()).saveAndFlush(any());
  }
}
