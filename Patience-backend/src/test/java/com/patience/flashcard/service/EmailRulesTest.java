package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailRulesTest {

  @Test
  void normalizeAndRejectBadShape() {
    assertThat(EmailRules.normalize("  A@B.CO  ")).isEqualTo("a@b.co");
    assertThat(EmailRules.invalidReason("not-mail")).contains("형식");
    assertThat(EmailRules.invalidReason("ok@mail.com")).isNull();
  }
}
