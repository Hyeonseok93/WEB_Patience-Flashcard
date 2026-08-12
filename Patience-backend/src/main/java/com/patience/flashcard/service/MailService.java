package com.patience.flashcard.service;

public interface MailService {
  void sendSignupCode(String to, String code);
}
