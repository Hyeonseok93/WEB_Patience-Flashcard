CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE decks (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    owner_id        BIGINT REFERENCES users(id) ON DELETE CASCADE,
    source_type     VARCHAR(16)  NOT NULL CHECK (source_type IN ('BUILTIN', 'USER')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_decks_builtin_name ON decks (name) WHERE source_type = 'BUILTIN';
CREATE UNIQUE INDEX ux_decks_user_name ON decks (owner_id, name) WHERE source_type = 'USER';

CREATE TABLE cards (
    id              BIGSERIAL PRIMARY KEY,
    deck_id         BIGINT       NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front_text      TEXT         NOT NULL,
    back_text       TEXT         NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0
);

CREATE INDEX ix_cards_deck ON cards (deck_id, sort_order);

CREATE TABLE study_progress (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id             BIGINT       NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    levels_json         JSONB        NOT NULL DEFAULT '{"1":[],"2":[],"3":[]}'::jsonb,
    queue_json          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    completed_count     INT          NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, deck_id)
);
