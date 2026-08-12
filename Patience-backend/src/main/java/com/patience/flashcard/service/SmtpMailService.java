package com.patience.flashcard.service;

import com.patience.flashcard.config.MailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class SmtpMailService implements MailService {

  private static final Logger log = LoggerFactory.getLogger(SmtpMailService.class);

  private final JavaMailSender mailSender;
  private final MailProperties mailProperties;

  public SmtpMailService(JavaMailSender mailSender, MailProperties mailProperties) {
    this.mailSender = mailSender;
    this.mailProperties = mailProperties;
  }

  // 공개 서비스: Mailhog 대신 Resend/SES 등 실제 SMTP.
  // application.properties 의 spring.mail.* auth·starttls 를 켜고
  // SPRING_MAIL_HOST 를 실제 호스트로 바꾸면 이 클래스는 그대로 씀.
  @Override
  public void sendSignupCode(String to, String code) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(mailProperties.from());
    message.setTo(to);
    message.setSubject("Patience 인증 번호");
    message.setText("가입 화면에 이 번호를 입력해 주세요.\n\n" + code + "\n\n10분 동안만 유효해요.");
    mailSender.send(message);
    log.info("Signup code queued for {}", to);
  }

  @Override
  public void sendResetCode(String to, String code) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(mailProperties.from());
    message.setTo(to);
    message.setSubject("Patience 비밀번호 찾기");
    message.setText("비밀번호를 바꾸려면 이 번호를 입력해 주세요.\n\n" + code + "\n\n10분 동안만 유효해요.");
    mailSender.send(message);
    log.info("Reset code queued for {}", to);
  }
}
