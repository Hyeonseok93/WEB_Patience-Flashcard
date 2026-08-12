package com.patience.flashcard.service;

public interface MailService {
  void sendSignupCode(String to, String code);

  void sendResetCode(String to, String code);
}
