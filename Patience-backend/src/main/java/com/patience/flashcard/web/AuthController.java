package com.patience.flashcard.web;

import com.patience.flashcard.service.AuthService;
import com.patience.flashcard.web.dto.EmailAvailableResponse;
import com.patience.flashcard.web.dto.EmailChallengeRequest;
import com.patience.flashcard.web.dto.EmailConfirmRequest;
import com.patience.flashcard.web.dto.LoginRequest;
import com.patience.flashcard.web.dto.MessageResponse;
import com.patience.flashcard.web.dto.ResetPasswordRequest;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UserResponse;
import com.patience.flashcard.web.dto.UsernameAvailableResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping("/username-available")
  public UsernameAvailableResponse usernameAvailable(
      @RequestParam(required = false) String username, HttpServletRequest httpRequest) {
    return authService.usernameAvailable(username, ClientIp.of(httpRequest));
  }

  @GetMapping("/email-available")
  public EmailAvailableResponse emailAvailable(
      @RequestParam(required = false) String email, HttpServletRequest httpRequest) {
    return authService.emailAvailable(email, ClientIp.of(httpRequest));
  }

  @PostMapping("/email-challenge")
  public MessageResponse emailChallenge(
      @Valid @RequestBody EmailChallengeRequest request, HttpServletRequest httpRequest) {
    return authService.requestEmailCode(request.email(), ClientIp.of(httpRequest));
  }

  @PostMapping("/email-confirm")
  public MessageResponse emailConfirm(
      @Valid @RequestBody EmailConfirmRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    return authService.confirmEmailCode(
        request.email(), request.code(), ClientIp.of(httpRequest), response);
  }

  @PostMapping("/signup")
  public UserResponse signup(
      @Valid @RequestBody SignupRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    return authService.signup(request, ClientIp.of(httpRequest), httpRequest, response);
  }

  @PostMapping("/login")
  public UserResponse login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    return authService.login(request, ClientIp.of(httpRequest), response);
  }

  @PostMapping("/forgot-password")
  public MessageResponse forgotPassword(
      @Valid @RequestBody EmailChallengeRequest request, HttpServletRequest httpRequest) {
    return authService.requestPasswordReset(request.email(), ClientIp.of(httpRequest));
  }

  @PostMapping("/reset-password")
  public MessageResponse resetPassword(
      @Valid @RequestBody ResetPasswordRequest request, HttpServletRequest httpRequest) {
    return authService.resetPassword(
        request.email(), request.code(), request.password(), ClientIp.of(httpRequest));
  }

  @PostMapping("/logout")
  public void logout(Authentication authentication, HttpServletResponse response) {
    authService.logout(authentication, response);
  }

  @GetMapping("/me")
  public UserResponse me(Authentication authentication) {
    return authService.me(authentication);
  }
}
