import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type CardItem, type DeckDetail } from "../api/client";
import { messageOf } from "../lib/errors";
import { useConfirm } from "../ui/confirm-context";
import { useToast } from "../ui/toast-context";

export default function EditDeckPage() {
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const replaceRef = useRef<HTMLInputElement>(null);

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  useEffect(() => {
    if (!Number.isFinite(deckId)) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await api.deckDetail(deckId);
        if (cancelled) return;
        if (detail.sourceType !== "USER") {
          navigate("/", { replace: true });
          return;
        }
        setDeck(detail);
        setName(detail.name);
      } catch (err) {
        if (!cancelled) setError(messageOf(err, "세트를 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, navigate]);

  async function saveName() {
    if (!deck) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === deck.name) return;
    setSavingName(true);
    try {
      const updated = await api.renameDeck(deckId, trimmed);
      setDeck((prev) => (prev ? { ...prev, name: updated.name } : prev));
      setName(updated.name);
      toast.success("이름을 바꿨어요");
    } catch (err) {
      toast.error(messageOf(err, "이름 변경에 실패했습니다."));
    } finally {
      setSavingName(false);
    }
  }

  async function onReplace(file: File | null) {
    if (!file) return;
    const ok = await confirm({
      title: "엑셀로 카드를 바꿀까요?",
      message: "기존 카드와 진행도가 모두 지워지고 새 파일로 교체됩니다.",
      confirmLabel: "교체하기",
      cancelLabel: "취소",
      danger: true,
    });
    if (!ok) {
      if (replaceRef.current) replaceRef.current.value = "";
      return;
    }
    setReplacing(true);
    try {
      await api.replaceDeckImport(deckId, file);
      const detail = await api.deckDetail(deckId);
      setDeck(detail);
      toast.success("카드를 교체했어요");
    } catch (err) {
      toast.error(messageOf(err, "교체에 실패했습니다."));
    } finally {
      setReplacing(false);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  async function onAddCard() {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) return;
    setAdding(true);
    try {
      const created = await api.addCard(deckId, f, b);
      setDeck((prev) => (prev ? { ...prev, cards: [...prev.cards, created] } : prev));
      setFront("");
      setBack("");
      toast.success("카드를 추가했어요 · 진행도는 초기화됩니다");
    } catch (err) {
      toast.error(messageOf(err, "카드 추가에 실패했습니다."));
    } finally {
      setAdding(false);
    }
  }

  function startEdit(card: CardItem) {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  async function saveEdit() {
    if (editingId == null) return;
    try {
      const updated = await api.updateCard(deckId, editingId, editFront.trim(), editBack.trim());
      setDeck((prev) =>
        prev
          ? { ...prev, cards: prev.cards.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      );
      setEditingId(null);
      toast.success("카드를 수정했어요");
    } catch (err) {
      toast.error(messageOf(err, "카드 수정에 실패했습니다."));
    }
  }

  async function onDeleteCard(card: CardItem) {
    const ok = await confirm({
      title: "이 카드를 삭제할까요?",
      message: "진행도도 함께 초기화됩니다.",
      confirmLabel: "삭제",
      cancelLabel: "취소",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteCard(deckId, card.id);
      setDeck((prev) =>
        prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== card.id) } : prev,
      );
      toast.success("카드를 삭제했어요");
    } catch (err) {
      toast.error(messageOf(err, "카드 삭제에 실패했습니다."));
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cream)] text-[var(--ink)]/45">
        불러오는 중…
      </div>
    );
  }

  if (error || !deck) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="text-[#8a3b24]">{error ?? "세트를 열 수 없습니다."}</p>
        <Link to="/" className="mt-6 rounded-full bg-[var(--moss)] px-6 py-3 text-sm font-semibold text-[var(--sand)]">
          세트 선택으로
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-[var(--mist)] bg-[var(--cream)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ink)]/55 transition hover:bg-white/70 hover:text-[var(--ink)]"
          >
            ← 목록
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[1.2rem] font-semibold text-[var(--moss)]">
            세트 편집
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8">
        <section className="rounded-3xl bg-white/70 p-6 ring-1 ring-[var(--mist)]">
          <h2 className="text-sm font-semibold">이름</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-2xl border border-[var(--ink)]/12 bg-white px-4 py-3 text-[0.95rem] outline-none focus:border-[var(--leaf)] focus:ring-4 focus:ring-[var(--leaf)]/15"
            />
            <button
              type="button"
              disabled={savingName || !name.trim() || name.trim() === deck.name}
              onClick={() => void saveName()}
              className="rounded-2xl bg-[var(--moss)] px-5 py-3 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:opacity-50"
            >
              {savingName ? "저장 중…" : "이름 저장"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-[var(--leaf)]/35 bg-white/55 p-6">
          <h2 className="text-sm font-semibold">엑셀로 카드 교체</h2>
          <p className="mt-1.5 text-sm text-[var(--ink)]/50">
            A열 앞면 · B열 뒷면. 셀 안 Alt+Enter 줄바꿈도 그대로 들어옵니다. 기존 카드와 진행도가 초기화됩니다.
          </p>
          <input
            ref={replaceRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-4 block w-full text-sm"
            disabled={replacing}
            onChange={(e) => void onReplace(e.target.files?.[0] ?? null)}
          />
        </section>

        <section className="rounded-3xl bg-white/70 p-6 ring-1 ring-[var(--mist)]">
          <h2 className="text-sm font-semibold">카드 추가</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="앞면 · Enter로 줄바꿈"
              rows={3}
              className="resize-y rounded-2xl border border-[var(--ink)]/12 bg-white px-4 py-3 text-[0.95rem] outline-none focus:border-[var(--leaf)] focus:ring-4 focus:ring-[var(--leaf)]/15"
            />
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="뒷면 · Enter로 줄바꿈"
              rows={3}
              className="resize-y rounded-2xl border border-[var(--ink)]/12 bg-white px-4 py-3 text-[0.95rem] outline-none focus:border-[var(--leaf)] focus:ring-4 focus:ring-[var(--leaf)]/15"
            />
          </div>
          <button
            type="button"
            disabled={adding || !front.trim() || !back.trim()}
            onClick={() => void onAddCard()}
            className="mt-3 rounded-2xl bg-[var(--moss)] px-5 py-2.5 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:opacity-50"
          >
            {adding ? "추가 중…" : "카드 추가"}
          </button>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">{deck.cards.length}장</h2>
          <ul className="space-y-2">
            {deck.cards.map((card) => (
              <li
                key={card.id}
                className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-[var(--mist)]"
              >
                {editingId === card.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-xl border border-[var(--ink)]/12 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-xl border border-[var(--ink)]/12 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        className="rounded-full bg-[var(--moss)] px-4 py-1.5 text-xs font-semibold text-[var(--sand)]"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full px-4 py-1.5 text-xs font-medium text-[var(--ink)]/50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap font-semibold">{card.front}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--ink)]/55">{card.back}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-[var(--moss)] hover:bg-[var(--moss)]/8"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteCard(card)}
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-[#a2452a] hover:bg-[#f8ebe4]"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
