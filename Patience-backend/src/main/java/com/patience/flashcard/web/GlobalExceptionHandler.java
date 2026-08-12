package com.patience.flashcard.web;

import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
    return body(ex.getStatus(), ex.getMessage());
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
    return body(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("입력값이 올바르지 않습니다.");
    return body(HttpStatus.BAD_REQUEST, message);
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, Object>> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
    return body(HttpStatus.PAYLOAD_TOO_LARGE, "파일 용량이 허용 범위를 초과했습니다.");
  }

  @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestPartException.class})
  public ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex) {
    return body(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다.");
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
    log.error("Unhandled exception", ex);
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }

  private ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
    return ResponseEntity.status(status)
        .body(
            Map.of(
                "status", status.value(),
                "message", message,
                "timestamp", Instant.now().toString()));
  }
}
