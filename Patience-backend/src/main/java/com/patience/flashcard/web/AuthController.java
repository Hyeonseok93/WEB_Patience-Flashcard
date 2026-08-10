package com.patience.flashcard.web;

import com.patience.flashcard.service.AuthService;
import com.patience.flashcard.web.dto.LoginRequest;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UserResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/signup")
  public UserResponse signup(@Valid @RequestBody SignupRequest request, HttpServletResponse response) {
    return authService.signup(request, response);
  }

  @PostMapping("/login")
  public UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    return authService.login(request, response);
  }

  @PostMapping("/logout")
  public void logout(HttpServletResponse response) {
    authService.logout(response);
  }

  @GetMapping("/me")
  public UserResponse me(Authentication authentication) {
    return authService.me(authentication);
  }
}
