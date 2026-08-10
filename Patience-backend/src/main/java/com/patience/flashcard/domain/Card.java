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

@Entity
@Table(name = "cards")
public class Card {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "deck_id", nullable = false)
  private Deck deck;

  @Column(name = "front_text", nullable = false, columnDefinition = "TEXT")
  private String frontText;

  @Column(name = "back_text", nullable = false, columnDefinition = "TEXT")
  private String backText;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  public Long getId() {
    return id;
  }

  public Deck getDeck() {
    return deck;
  }

  public void setDeck(Deck deck) {
    this.deck = deck;
  }

  public String getFrontText() {
    return frontText;
  }

  public void setFrontText(String frontText) {
    this.frontText = frontText;
  }

  public String getBackText() {
    return backText;
  }

  public void setBackText(String backText) {
    this.backText = backText;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }
}
