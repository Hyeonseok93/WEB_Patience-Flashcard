package com.patience.flashcard.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    name = "study_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "deck_id"}))
public class StudyProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "deck_id", nullable = false)
  private Deck deck;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "levels_json", nullable = false, columnDefinition = "jsonb")
  private String levelsJson = "{\"1\":[],\"2\":[],\"3\":[]}";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "queue_json", nullable = false, columnDefinition = "jsonb")
  private String queueJson = "[]";

  @Column(name = "completed_count", nullable = false)
  private int completedCount;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  public Long getId() {
    return id;
  }

  public UserAccount getUser() {
    return user;
  }

  public void setUser(UserAccount user) {
    this.user = user;
  }

  public Deck getDeck() {
    return deck;
  }

  public void setDeck(Deck deck) {
    this.deck = deck;
  }

  public String getLevelsJson() {
    return levelsJson;
  }

  public void setLevelsJson(String levelsJson) {
    this.levelsJson = levelsJson;
  }

  public String getQueueJson() {
    return queueJson;
  }

  public void setQueueJson(String queueJson) {
    this.queueJson = queueJson;
  }

  public int getCompletedCount() {
    return completedCount;
  }

  public void setCompletedCount(int completedCount) {
    this.completedCount = completedCount;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
