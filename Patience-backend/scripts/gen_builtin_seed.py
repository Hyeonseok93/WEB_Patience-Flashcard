import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_elements import ELEMENTS
from seed_sajaseonge import SAJASEONGEO
from seed_world_capitals import WORLD_CAPITALS

hiragana_ko = [
    ("あ", "아"),
    ("い", "이"),
    ("う", "우"),
    ("え", "에"),
    ("お", "오"),
    ("か", "카"),
    ("き", "키"),
    ("く", "쿠"),
    ("け", "케"),
    ("こ", "코"),
    ("さ", "사"),
    ("し", "시"),
    ("す", "스"),
    ("せ", "세"),
    ("そ", "소"),
    ("た", "타"),
    ("ち", "치"),
    ("つ", "츠"),
    ("て", "테"),
    ("と", "토"),
    ("な", "나"),
    ("に", "니"),
    ("ぬ", "누"),
    ("ね", "네"),
    ("の", "노"),
    ("は", "하"),
    ("ひ", "히"),
    ("ふ", "후"),
    ("へ", "헤"),
    ("ほ", "호"),
    ("ま", "마"),
    ("み", "미"),
    ("む", "무"),
    ("め", "메"),
    ("も", "모"),
    ("や", "야"),
    ("ゆ", "유"),
    ("よ", "요"),
    ("ら", "라"),
    ("り", "리"),
    ("る", "루"),
    ("れ", "레"),
    ("ろ", "로"),
    ("わ", "와"),
    ("を", "오"),
    ("ん", "응"),
]

katakana_ko = [
    ("ア", "아"),
    ("イ", "이"),
    ("ウ", "우"),
    ("エ", "에"),
    ("オ", "오"),
    ("カ", "카"),
    ("キ", "키"),
    ("ク", "쿠"),
    ("ケ", "케"),
    ("コ", "코"),
    ("サ", "사"),
    ("シ", "시"),
    ("ス", "스"),
    ("セ", "세"),
    ("ソ", "소"),
    ("タ", "타"),
    ("チ", "치"),
    ("ツ", "츠"),
    ("テ", "테"),
    ("ト", "토"),
    ("ナ", "나"),
    ("ニ", "니"),
    ("ヌ", "누"),
    ("ネ", "네"),
    ("ノ", "노"),
    ("ハ", "하"),
    ("ヒ", "히"),
    ("フ", "후"),
    ("ヘ", "헤"),
    ("ホ", "호"),
    ("マ", "마"),
    ("ミ", "미"),
    ("ム", "무"),
    ("メ", "메"),
    ("モ", "모"),
    ("ヤ", "야"),
    ("ユ", "유"),
    ("ヨ", "요"),
    ("ラ", "라"),
    ("リ", "리"),
    ("ル", "루"),
    ("レ", "레"),
    ("ロ", "로"),
    ("ワ", "와"),
    ("ヲ", "오"),
    ("ン", "응"),
]

hiragana_daku = [
    ("が", "가"),
    ("ぎ", "기"),
    ("ぐ", "구"),
    ("げ", "게"),
    ("ご", "고"),
    ("ざ", "자"),
    ("じ", "지"),
    ("ず", "즈"),
    ("ぜ", "제"),
    ("ぞ", "조"),
    ("だ", "다"),
    ("ぢ", "지"),
    ("づ", "즈"),
    ("で", "데"),
    ("ど", "도"),
    ("ば", "바"),
    ("び", "비"),
    ("ぶ", "부"),
    ("べ", "베"),
    ("ぼ", "보"),
    ("ぱ", "파"),
    ("ぴ", "피"),
    ("ぷ", "푸"),
    ("ぺ", "페"),
    ("ぽ", "포"),
]

katakana_daku = [
    ("ガ", "가"),
    ("ギ", "기"),
    ("グ", "구"),
    ("ゲ", "게"),
    ("ゴ", "고"),
    ("ザ", "자"),
    ("ジ", "지"),
    ("ズ", "즈"),
    ("ゼ", "제"),
    ("ゾ", "조"),
    ("ダ", "다"),
    ("ヂ", "지"),
    ("ヅ", "즈"),
    ("デ", "데"),
    ("ド", "도"),
    ("バ", "바"),
    ("ビ", "비"),
    ("ブ", "부"),
    ("ベ", "베"),
    ("ボ", "보"),
    ("パ", "파"),
    ("ピ", "피"),
    ("プ", "푸"),
    ("ペ", "페"),
    ("ポ", "포"),
]

hiragana_yoon = [
    ("きゃ", "캬"),
    ("きゅ", "큐"),
    ("きょ", "쿄"),
    ("しゃ", "샤"),
    ("しゅ", "슈"),
    ("しょ", "쇼"),
    ("ちゃ", "챠"),
    ("ちゅ", "츄"),
    ("ちょ", "쵸"),
    ("にゃ", "냐"),
    ("にゅ", "뉴"),
    ("にょ", "뇨"),
    ("ひゃ", "햐"),
    ("ひゅ", "휴"),
    ("ひょ", "효"),
    ("みゃ", "먀"),
    ("みゅ", "뮤"),
    ("みょ", "묘"),
    ("りゃ", "랴"),
    ("りゅ", "류"),
    ("りょ", "료"),
    ("ぎゃ", "갸"),
    ("ぎゅ", "규"),
    ("ぎょ", "교"),
    ("じゃ", "쟈"),
    ("じゅ", "쥬"),
    ("じょ", "죠"),
    ("びゃ", "뱌"),
    ("びゅ", "뷰"),
    ("びょ", "뵤"),
    ("ぴゃ", "퍄"),
    ("ぴゅ", "퓨"),
    ("ぴょ", "표"),
]

numbers = [
    ("一", "1 / 이치"),
    ("二", "2 / 니"),
    ("三", "3 / 산"),
    ("四", "4 / 욘"),
    ("五", "5 / 고"),
    ("六", "6 / 로쿠"),
    ("七", "7 / 나나"),
    ("八", "8 / 하치"),
    ("九", "9 / 큐"),
    ("十", "10 / 주"),
    ("十一", "11 / 주이치"),
    ("十二", "12 / 주니"),
    ("十三", "13 / 주산"),
    ("十四", "14 / 주욘"),
    ("十五", "15 / 주고"),
    ("十六", "16 / 주로쿠"),
    ("十七", "17 / 주나나"),
    ("十八", "18 / 주하치"),
    ("十九", "19 / 주큐"),
    ("二十", "20 / 니주"),
    ("三十", "30 / 산주"),
    ("四十", "40 / 욘주"),
    ("五十", "50 / 고주"),
    ("百", "100 / 햐쿠"),
    ("千", "1000 / 센"),
]


def esc(s: str) -> str:
    return s.replace("'", "''")


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


def flipped(pairs: list[tuple[str, str]]) -> list[tuple[str, str]]:
    return [(back, front) for front, back in pairs]


def sajaseonge_cards() -> list[tuple[str, str]]:
    cards = []
    for hangul, rest in SAJASEONGEO:
        hanja, sep, meaning = rest.partition(" · ")
        if not sep:
            raise ValueError(f"bad idiom row: {hangul}")
        cards.append((f"{hanja}\n{hangul}", meaning))
    return cards


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


def main() -> None:
    out = "-- Built-in starter decks. Names: category · set. Order: sort_order.\n\n"
    out += deck_block("일본어 · 히라가나", hiragana_ko, 10) + "\n"
    out += deck_block("일본어 · 히라가나 탁음", hiragana_daku, 20) + "\n"
    out += deck_block("일본어 · 히라가나 요음", hiragana_yoon, 30) + "\n"
    out += deck_block("일본어 · 히라가나 받아쓰기", flipped(hiragana_ko), 40) + "\n"
    out += deck_block("일본어 · 가타카나", katakana_ko, 50) + "\n"
    out += deck_block("일본어 · 가타카나 탁음", katakana_daku, 60) + "\n"
    out += deck_block("일본어 · 가타카나 받아쓰기", flipped(katakana_ko), 70) + "\n"
    out += deck_block("일본어 · 숫자", numbers, 80) + "\n"
    out += deck_block("지리 · 세계 수도", WORLD_CAPITALS, 90) + "\n"
    out += deck_block("과학 · 원소 기호", ELEMENTS, 100) + "\n"
    out += deck_block("국어 · 사자성어", sajaseonge_cards(), 110) + "\n"

    root = Path(__file__).resolve().parents[1]
    path = root / "src/main/resources/db/migration/V2__seed_builtin_jp_decks.sql"
    path.write_text(out.rstrip() + "\n", encoding="utf-8")
    total = (
        (len(hiragana_ko) + len(katakana_ko)) * 2
        + len(hiragana_daku)
        + len(katakana_daku)
        + len(hiragana_yoon)
        + len(numbers)
        + len(WORLD_CAPITALS)
        + len(ELEMENTS)
        + len(SAJASEONGEO)
    )
    print(
        f"wrote {path} ({total} cards; "
        f"capitals={len(WORLD_CAPITALS)} elements={len(ELEMENTS)} idioms={len(SAJASEONGEO)})"
    )


if __name__ == "__main__":
    main()
