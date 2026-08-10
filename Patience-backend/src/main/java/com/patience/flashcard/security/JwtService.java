package com.patience.flashcard.security;

import com.patience.flashcard.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

  /** The insecure default shipped in application.properties for local dev only. */
  static final String DEFAULT_DEV_SECRET = "patience-local-jwt-secret-change-me-32b";

  private final JwtProperties properties;
  private final SecretKey key;

  public JwtService(JwtProperties properties, Environment environment) {
    this.properties = properties;
    byte[] secretBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
    if (secretBytes.length < 32) {
      throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
    }
    boolean isProd = environment.acceptsProfiles(Profiles.of("prod"));
    if (isProd && DEFAULT_DEV_SECRET.equals(properties.secret())) {
      throw new IllegalStateException(
          "Refusing to start with the default JWT secret under the 'prod' profile. Set the JWT_SECRET environment variable.");
    }
    this.key = Keys.hmacShaKeyFor(secretBytes);
  }

  public String createToken(Long userId, String username) {
    Date now = new Date();
    Date exp = new Date(now.getTime() + properties.expirationMs());
    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("username", username)
        .issuedAt(now)
        .expiration(exp)
        .signWith(key)
        .compact();
  }

  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }

  public String cookieName() {
    return properties.cookieName();
  }

  public boolean cookieSecure() {
    return properties.cookieSecure();
  }

  public long expirationMs() {
    return properties.expirationMs();
  }
}
