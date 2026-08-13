-- Align unique deck names with app-level IgnoreCase checks.
DROP INDEX IF EXISTS ux_decks_builtin_name;
DROP INDEX IF EXISTS ux_decks_user_name;

CREATE UNIQUE INDEX ux_decks_builtin_name ON decks (LOWER(name)) WHERE source_type = 'BUILTIN';
CREATE UNIQUE INDEX ux_decks_user_name ON decks (owner_id, LOWER(name)) WHERE source_type = 'USER';
