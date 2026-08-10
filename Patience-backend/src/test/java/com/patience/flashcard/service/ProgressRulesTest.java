package com.patience.flashcard.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProgressRulesTest {

  @Test
  void threeLevelCapacitiesMatchEngine() {
    assertThat(ProgressRules.limitFor(1, 3)).isEqualTo(3);
    assertThat(ProgressRules.limitFor(2, 3)).isEqualTo(5);
    assertThat(ProgressRules.limitFor(3, 3)).isEqualTo(7);
  }

  @Test
  void twoLevelCapacitiesMatchEngine() {
    assertThat(ProgressRules.limitFor(1, 2)).isEqualTo(3);
    assertThat(ProgressRules.limitFor(2, 2)).isEqualTo(7);
  }

  @Test
  void fourLevelCapacitiesMatchEngine() {
    assertThat(ProgressRules.limitFor(1, 4)).isEqualTo(3);
    assertThat(ProgressRules.limitFor(2, 4)).isEqualTo(5);
    assertThat(ProgressRules.limitFor(3, 4)).isEqualTo(5);
    assertThat(ProgressRules.limitFor(4, 4)).isEqualTo(7);
  }
}
