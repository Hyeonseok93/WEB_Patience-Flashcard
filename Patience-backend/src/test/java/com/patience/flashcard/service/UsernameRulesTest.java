package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UsernameRulesTest {

  @Test
  void normalizeTrimsAndLowercases() {
    assertThat(UsernameRules.normalize("  HyunM  ")).isEqualTo("hyunm");
  }

  @Test
  void rejectsShortReservedAndOddCharacters() {
    assertThat(UsernameRules.invalidReason("ab")).contains("3자");
    assertThat(UsernameRules.invalidReason("admin")).contains("쓸 수 없어요");
    assertThat(UsernameRules.invalidReason("안녕")).contains("영문");
    assertThat(UsernameRules.invalidReason("ok_user")).contains("숫자만");
    assertThat(UsernameRules.invalidReason("okuser")).isNull();
  }
}
