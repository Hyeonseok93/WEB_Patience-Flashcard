package com.patience.flashcard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Shared “is this progress still in play?” check for list + GET. */
public final class ProgressActivity {

  private ProgressActivity() {}

  public static boolean isActive(ObjectMapper mapper, String levelsJson, String queueJson) {
    return hasAnyIds(mapper, levelsJson) || hasAnyIds(mapper, queueJson);
  }

  public static boolean hasAnyIds(ObjectMapper mapper, String json) {
    if (json == null || json.isBlank()) {
      return false;
    }
    try {
      JsonNode node = mapper.readTree(json);
      if (node == null) {
        return false;
      }
      if (node.isArray()) {
        return node.size() > 0;
      }
      if (node.isObject()) {
        for (var property : node.properties()) {
          JsonNode value = property.getValue();
          if (value != null && value.isArray() && value.size() > 0) {
            return true;
          }
        }
      }
      return false;
    } catch (Exception ex) {
      return false;
    }
  }
}
