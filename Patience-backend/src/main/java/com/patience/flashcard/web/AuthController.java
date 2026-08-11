package com.patience.flashcard.web;

import com.patience.flashcard.service.AuthService;
import com.patience.flashcard.web.dto.LoginRequest;
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
      @RequestParam(required = false) String username) {
    return authService.usernameAvailable(username);
  }

  @PostMapping("/signup")
  public UserResponse signup(
      @Valid @RequestBody SignupRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    return authService.signup(request, httpRequest.getRemoteAddr(), response);
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
