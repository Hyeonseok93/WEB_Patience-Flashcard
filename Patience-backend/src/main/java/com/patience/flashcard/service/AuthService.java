package com.patience.flashcard.service;

import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.UserAccountRepository;
import com.patience.flashcard.security.JwtService;
import com.patience.flashcard.security.UserPrincipal;
import com.patience.flashcard.web.ApiException;
import com.patience.flashcard.web.dto.LoginRequest;
import com.patience.flashcard.web.dto.SignupRequest;
import com.patience.flashcard.web.dto.UserResponse;
import com.patience.flashcard.web.dto.UsernameAvailableResponse;
import jakarta.servlet.http.HttpServletResponse;
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

  private final UserAccountRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final SignupRateLimiter signupRateLimiter;

  public AuthService(
      UserAccountRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      SignupRateLimiter signupRateLimiter) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.signupRateLimiter = signupRateLimiter;
  }

  @Transactional(readOnly = true)
  public UsernameAvailableResponse usernameAvailable(String raw) {
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

  @Transactional
  public UserResponse signup(SignupRequest request, String clientIp, HttpServletResponse response) {
    signupRateLimiter.assertAllowed(clientIp);
    String username = UsernameRules.normalize(request.username());
    String invalid = UsernameRules.invalidReason(username);
    if (invalid != null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, invalid);
    }
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      throw new ApiException(HttpStatus.CONFLICT, "이미 있어요");
    }
    UserAccount user = new UserAccount();
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    try {
      // saveAndFlush surfaces the unique-constraint violation here (inside the try) instead of
      // at commit time, so a concurrent signup becomes a clean 409 rather than a 500.
      userRepository.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(HttpStatus.CONFLICT, "이미 있어요");
    }
    writeAuthCookie(response, user);
    return toResponse(user);
  }

  @Transactional(readOnly = true)
  public UserResponse login(LoginRequest request, HttpServletResponse response) {
    String username = UsernameRules.normalize(request.username());
    UserAccount user =
        userRepository
            .findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new BadCredentialsException("bad credentials"));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new BadCredentialsException("bad credentials");
    }
    writeAuthCookie(response, user);
    return toResponse(user);
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

  public UserResponse me(Authentication authentication) {
    UserPrincipal principal = requirePrincipal(authentication);
    // The JWT is signed, so id/username in the principal are trustworthy without another DB read.
    return new UserResponse(principal.getId(), principal.getUsername());
  }

  /**
   * Returns a managed reference to the authenticated user without issuing an extra SELECT. The
   * {@code JwtAuthFilter} already validated existence when it built the principal, and downstream
   * JPA queries only need the foreign-key id.
   */
  public UserAccount requireUser(Authentication authentication) {
    UserPrincipal principal = requirePrincipal(authentication);
    return userRepository.getReferenceById(principal.getId());
  }

  private UserPrincipal requirePrincipal(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    return principal;
  }

  private void writeAuthCookie(HttpServletResponse response, UserAccount user) {
    String token = jwtService.createToken(user.getId(), user.getUsername());
    ResponseCookie cookie =
        ResponseCookie.from(jwtService.cookieName(), token)
            .httpOnly(true)
            .secure(jwtService.cookieSecure())
            .path("/")
            .sameSite("Lax")
            .maxAge(jwtService.expirationMs() / 1000)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private UserResponse toResponse(UserAccount user) {
    return new UserResponse(user.getId(), user.getUsername());
  }
}
