package com.patience.flashcard.security;

import com.patience.flashcard.domain.UserAccount;
import com.patience.flashcard.repository.UserAccountRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserAccountRepository userRepository;

  public JwtAuthFilter(JwtService jwtService, UserAccountRepository userRepository) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      readToken(request)
          .flatMap(this::authenticate)
          .ifPresent(
              auth -> {
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
              });
    }
    filterChain.doFilter(request, response);
  }

  private Optional<String> readToken(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
      Optional<String> fromCookie =
          Arrays.stream(cookies)
              .filter(c -> jwtService.cookieName().equals(c.getName()))
              .map(Cookie::getValue)
              .findFirst();
      if (fromCookie.isPresent()) {
        return fromCookie;
      }
    }
    // 공개 서비스: 모바일/외부 API용 Bearer가 필요하면 아래를 다시 켜기.
    // 지금은 쿠키만 씀. CSRF 끈 상태에서 Bearer를 열어 두면 공격면이 늘어남.
    // String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    // if (header != null && header.startsWith("Bearer ")) {
    //   return Optional.of(header.substring(7));
    // }
    return Optional.empty();
  }

  private Optional<UsernamePasswordAuthenticationToken> authenticate(String token) {
    try {
      Claims claims = jwtService.parse(token);
      Long userId = Long.valueOf(claims.getSubject());
      Optional<UserAccount> user = userRepository.findById(userId);
      if (user.isEmpty()) {
        return Optional.empty();
      }
      UserPrincipal principal = new UserPrincipal(user.get());
      return Optional.of(
          new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    } catch (Exception ex) {
      return Optional.empty();
    }
  }
}
