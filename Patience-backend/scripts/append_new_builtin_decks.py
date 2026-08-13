"""Append N5 kanji deck to V2 seed SQL."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_n5_kanji import N5_KANJI


def sql_str(s: str) -> str:
    escaped = s.replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n")
    if "\\n" in escaped:
        return "E'" + escaped + "'"
    return "'" + escaped + "'"


def values_sql(pairs: list[tuple[str, str]]) -> str:
    lines = []
    for i, (front, back) in enumerate(pairs, 1):
        lines.append(f"        ({sql_str(front)}, {sql_str(back)}, {i})")
    return ",\n".join(lines)


def deck_block(name: str, pairs: list[tuple[str, str]], sort_order: int) -> str:
    return f"""INSERT INTO decks (name, owner_id, source_type, sort_order)
VALUES ({sql_str(name)}, NULL, 'BUILTIN', {sort_order});

INSERT INTO cards (deck_id, front_text, back_text, sort_order)
SELECT d.id, v.front, v.back, v.ord
FROM decks d
CROSS JOIN (
    VALUES
{values_sql(pairs)}
) AS v(front, back, ord)
WHERE d.name = {sql_str(name)} AND d.source_type = 'BUILTIN';
"""


DECKS: list[tuple[str, list[tuple[str, str]], int]] = [
    ("일본어 · N5 한자", N5_KANJI, 130),
]


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    path = root / "src/main/resources/db/migration/V2__seed_builtin_jp_decks.sql"
    existing = path.read_text(encoding="utf-8")

    already = [name for name, _, _ in DECKS if name in existing]
    if already:
        print("refuse: deck name(s) already in V2 — " + ", ".join(already))
        print("skip append (idempotent)")
        for name, pairs, _ in DECKS:
            print(f"  {name}: {len(pairs)} cards")
        return

    for name, pairs, _ in DECKS:
        fronts = [f for f, _ in pairs]
        if len(fronts) != len(set(fronts)):
            dupes = sorted({f for f in fronts if fronts.count(f) > 1})
            raise SystemExit(f"duplicate fronts in {name}: {dupes[:10]}")

    blocks = [deck_block(name, pairs, order) for name, pairs, order in DECKS]
    appendix = "\n" + "\n".join(blocks)
    if not existing.endswith("\n"):
        existing += "\n"
    path.write_text(existing.rstrip() + "\n" + appendix.lstrip() + "\n", encoding="utf-8")

    print(f"appended to {path}")
    total = 0
    for name, pairs, order in DECKS:
        print(f"  [{order}] {name}: {len(pairs)} cards")
        total += len(pairs)
    print(f"total new cards: {total}")


if __name__ == "__main__":
    main()
