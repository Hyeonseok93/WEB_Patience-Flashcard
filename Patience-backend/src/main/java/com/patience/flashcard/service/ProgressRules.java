package com.patience.flashcard.service;

/**
 * Mirrors Patience-frontend {@code engine.ts} capacity rules so saved progress cannot exceed what
 * the play engine allows.
 */
final class ProgressRules {

  static final int MIN_LEVELS = 2;
  static final int MAX_LEVELS = 4;
  static final int BOTTOM_LIMIT = 3;

  private ProgressRules() {}

  /** Level 1 = 3, last level = 7, middle levels = 5. */
  static int limitFor(int level, int levelCount) {
    if (level < 1 || level > levelCount) {
      throw new IllegalArgumentException("level out of range");
    }
    if (level == 1) {
      return BOTTOM_LIMIT;
    }
    if (level == levelCount) {
      return 7;
    }
    return 5;
  }
}
