package com.patience.flashcard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class PatienceFlashcardApplication {
  public static void main(String[] args) {
    SpringApplication.run(PatienceFlashcardApplication.class, args);
  }
}
