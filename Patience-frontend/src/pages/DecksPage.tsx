import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type DeckSummary } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { takeJustJoined } from "../auth/welcome";
import { messageOf } from "../lib/errors";
import { useConfirm } from "../ui/confirm-context";
import LevelPicker from "../ui/LevelPicker";
import { useToast } from "../ui/toast-context";

type Tab = "builtin" | "mine";

/** 이 개수를 넘으면 목록 영역만 따로 스크롤한다. */
const SCROLL_AFTER = 6;

export default function DecksPage() {
  const { user, logout } = useAuth();
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("builtin");
  const [builtin, setBuiltin] = useState<DeckSummary[]>([]);
  const [mine, setMine] = useState<DeckSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [pickerMode, setPickerMode] = useState<"order" | "shuffle" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [justJoined] = useState(() => takeJustJoined());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, m] = await Promise.all([api.builtinDecks(), api.myDecks()]);
        if (cancelled) return;
        setBuiltin(b);
        setMine(m);
      } catch (err) {
        if (!cancelled) setError(messageOf(err, "세트를 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    setSelectedId(null);
  }

  const decks = tab === "builtin" ? builtin : mine;
  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedId) ?? null,
    [decks, selectedId],
  );
  const scrollable = decks.length > SCROLL_AFTER;

  async function onImport(file: File | null) {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const created = await api.importDeck(file, deckName || undefined);
      setMine((prev) => [created, ...prev]);
      setTab("mine");
      setSelectedId(created.id);
      setDeckName("");
      toast.success(`「${created.name}」 세트를 만들었어요`);
    } catch (err) {
      const message = messageOf(err, "가져오기에 실패했습니다.");
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (selectedId == null || tab !== "mine") return;
    const ok = await confirm({
      title: "이 세트를 삭제할까요?",
      message: "세트와 함께 진행도도 사라져요.\n되돌릴 수 없습니다.",
      confirmLabel: "삭제하기",
      cancelLabel: "남겨두기",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteDeck(selectedId);
      setMine((prev) => prev.filter((d) => d.id !== selectedId));
      setSelectedId(null);
      toast.success("세트를 삭제했어요");
    } catch (err) {
      const message = messageOf(err, "삭제에 실패했습니다.");
      setError(message);
      toast.error(message);
    }
  }

  function startContinue() {
    if (selectedId == null) return;
    navigate(`/play/${selectedId}`);
  }

  function startWithLevels(levels: number) {
    if (selectedId == null || pickerMode == null) return;
    const key = pickerMode === "shuffle" ? "shuffle" : "order";
    navigate(`/play/${selectedId}?${key}=1&levels=${levels}`);
    setPickerMode(null);
  }

  return (
    <div className="min-h-screen pb-40">
      <header className="sticky top-0 z-30 border-b border-[var(--mist)] bg-[var(--cream)]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-4 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 shrink-0 select-none drop-shadow-sm"
              draggable={false}
            />
            <p className="truncate font-display text-[1.05rem] leading-none tracking-[-0.02em] text-[var(--moss)] sm:text-[1.35rem]">
              Patience Flashcard
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="max-w-[6.5rem] truncate rounded-full bg-white/70 px-2.5 py-1.5 text-sm font-medium text-[var(--ink)]/70 ring-1 ring-[var(--mist)] sm:max-w-[12rem] sm:px-3.5">
              {user?.username}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--ink)]/55 transition hover:bg-white/70 hover:text-[var(--ink)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold tracking-[-0.02em]">
          {justJoined ? `${justJoined}님, 자리 만들었어요.` : "오늘은 어떤 걸 외워볼까요"}
        </h1>
        <p className="mt-2 text-[0.95rem] text-[var(--ink)]/55">
          {justJoined ? "오늘은 어떤 걸 외워볼까요." : "원하는 세트를 골라 주세요."}
        </p>

        <div
          role="tablist"
          aria-label="세트 종류"
          className="mt-7 inline-flex gap-1 rounded-full bg-white/70 p-1.5 shadow-[0_2px_12px_rgba(21,38,31,0.06)] ring-1 ring-[var(--mist)]"
        >
          <TabButton
            active={tab === "builtin"}
            count={builtin.length}
            activeClass="bg-[var(--moss)] text-[var(--sand)]"
            onClick={() => changeTab("builtin")}
          >
            기본 제공
          </TabButton>
          <TabButton
            active={tab === "mine"}
            count={mine.length}
            activeClass="bg-[var(--gold)] text-[var(--moss-deep)]"
            onClick={() => changeTab("mine")}
          >
            내 세트
          </TabButton>
        </div>

        {error && (
          <p
            className="mt-6 rounded-2xl bg-[#f8ebe4] px-4 py-3 text-sm text-[#8a3b24]"
            role="alert"
          >
            {error}
          </p>
        )}

        {tab === "mine" && (
          <section className="mt-7 rounded-3xl border border-dashed border-[var(--leaf)]/35 bg-white/55 p-6">
            <h2 className="text-[0.95rem] font-semibold">엑셀로 세트 만들기</h2>
            <p className="mt-1.5 text-sm text-[var(--ink)]/50">
              A열에 앞면, B열에 뒷면을 적어 두면 그대로 카드가 됩니다. 2MB · 5,000행 · 앞·뒤 각 2,000자까지.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                aria-label="세트 이름"
                className="flex-1 rounded-2xl border border-[var(--ink)]/12 bg-white px-4 py-3 text-[0.95rem] outline-none transition focus:border-[var(--leaf)] focus:ring-4 focus:ring-[var(--leaf)]/15"
              />
              <input
                ref={fileRef}
                id="deck-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
                disabled={importing}
              />
              <label
                htmlFor="deck-file"
                className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-[var(--moss)] px-6 py-3 text-[0.95rem] font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] ${
                  importing ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {importing ? "가져오는 중…" : "파일 선택"}
              </label>
            </div>
            <p className="mt-2.5 text-xs text-[var(--ink)]/40">
              이름을 비워 두면 파일 이름을 그대로 씁니다.
            </p>
          </section>
        )}

        <div className={tab === "mine" ? "mt-6" : "mt-7"}>
          {loading ? (
            <ul className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[4.6rem] animate-pulse rounded-2xl bg-white/60 ring-1 ring-[var(--mist)]"
                />
              ))}
            </ul>
          ) : decks.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <div className="relative">
              <ul
                className={`space-y-2.5 ${
                  scrollable
                    ? "deck-scroll max-h-[min(58vh,34rem)] overflow-y-auto overflow-x-hidden p-1.5 pb-7 pr-3"
                    : "p-1.5"
                }`}
              >
                {decks.map((deck) => (
                  <li key={deck.id}>
                    <DeckRow
                      deck={deck}
                      selected={selectedId === deck.id}
                      accent={tab === "builtin" ? "moss" : "gold"}
                      onSelect={() => setSelectedId(deck.id)}
                    />
                  </li>
                ))}
              </ul>

              {scrollable && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--cream)] via-[var(--cream)]/70 to-transparent"
                  aria-hidden
                />
              )}
            </div>
          )}
        </div>
      </main>

      {selectedDeck && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-5">
          <div className="animate-fade-up mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[1.5rem] border border-[var(--mist)] bg-white/85 px-5 py-3.5 shadow-[0_10px_40px_rgba(21,38,31,0.16)] backdrop-blur-md md:flex-row md:items-center md:rounded-full md:py-3">
            <div className="min-w-0 md:flex-1">
              <p className="truncate text-[0.95rem] font-semibold">{selectedDeck.name}</p>
              <p className="text-xs text-[var(--ink)]/45">{selectedDeck.cardCount}장</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {selectedDeck.studyLevels != null && (
                <button
                  type="button"
                  onClick={startContinue}
                  className="rounded-full bg-[var(--moss)] px-5 py-2.5 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)]"
                >
                  이어서 학습
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickerMode("order")}
                className={
                  selectedDeck.studyLevels == null
                    ? "rounded-full bg-[var(--moss)] px-5 py-2.5 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)]"
                    : "rounded-full border border-[var(--moss)]/25 px-5 py-2.5 text-sm font-semibold text-[var(--moss)] transition hover:bg-[var(--moss)]/8"
                }
              >
                <span className="md:hidden">순서대로</span>
                <span className="hidden md:inline">순서대로 시작하기</span>
              </button>
              <button
                type="button"
                onClick={() => setPickerMode("shuffle")}
                className="rounded-full border border-[var(--moss)]/25 px-5 py-2.5 text-sm font-semibold text-[var(--moss)] transition hover:bg-[var(--moss)]/8"
              >
                <span className="md:hidden">랜덤</span>
                <span className="hidden md:inline">랜덤으로 시작하기</span>
              </button>
              {tab === "mine" && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/decks/${selectedDeck.id}/edit`)}
                    className="rounded-full border border-[var(--moss)]/25 px-4 py-2.5 text-sm font-semibold text-[var(--moss)] transition hover:bg-[var(--moss)]/8"
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete()}
                    className="rounded-full px-3 py-2 text-sm font-medium text-[#a2452a] transition hover:bg-[#f8ebe4]"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <LevelPicker
        open={pickerMode !== null}
        title="몇 층으로 시작할까요?"
        note={
          pickerMode === "shuffle"
            ? "순서를 섞어 처음부터 시작해요. 정한 층수는 진행 내내 유지돼요."
            : "원래 순서로 처음부터 시작해요. 정한 층수는 진행 내내 유지돼요."
        }
        onPick={startWithLevels}
        onClose={() => setPickerMode(null)}
      />
    </div>
  );
}

function TabButton({
  active,
  count,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
        active ? activeClass : "text-[var(--ink)]/50 hover:text-[var(--ink)]"
      }`}
    >
      {children}
      <span
        className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
          active ? "bg-black/12" : "bg-[var(--ink)]/6"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function DeckRow({
  deck,
  selected,
  accent,
  onSelect,
}: {
  deck: DeckSummary;
  selected: boolean;
  accent: "moss" | "gold";
  onSelect: () => void;
}) {
  const ring = accent === "gold" ? "var(--gold)" : "var(--moss)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group flex w-full items-center gap-4 rounded-2xl bg-white/80 px-5 py-4 text-left transition duration-150 hover:bg-white"
      style={{
        boxShadow: selected
          ? `0 0 0 2px ${ring}, 0 8px 22px rgba(21,38,31,0.1)`
          : "inset 0 0 0 1px rgba(21,38,31,0.07)",
      }}
    >
      <span
        className="h-9 w-1.5 shrink-0 rounded-full transition-opacity"
        style={{ background: ring, opacity: selected ? 1 : 0.35 }}
        aria-hidden
      />

      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className="block truncate whitespace-nowrap text-[1rem] font-semibold leading-snug [overflow-wrap:normal] [word-break:normal]"
          title={deck.name}
        >
          {deck.name}
        </span>
        <span className="mt-1 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden text-xs text-[var(--ink)]/45">
          <span className="shrink-0">{deck.cardCount}장</span>
          {deck.studyLevels != null ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 truncate rounded-full bg-[var(--moss)]/12 px-2 py-0.5 font-semibold text-[var(--moss)]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--moss)]" aria-hidden />
              <span className="truncate">
                {deck.studyLevels}층
              </span>
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ink)]/6 px-2 py-0.5 font-medium text-[var(--ink)]/40">
              시작 전
            </span>
          )}
        </span>
      </span>

      {selected ? (
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: ring }}
          aria-hidden
        >
          ✓
        </span>
      ) : (
        <span
          className="shrink-0 text-lg text-[var(--ink)]/20 transition group-hover:translate-x-0.5 group-hover:text-[var(--ink)]/40"
          aria-hidden
        >
          ›
        </span>
      )}
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--mist)] bg-white/50 px-6 py-16 text-center">
      <p className="text-[1.05rem] font-semibold text-[var(--ink)]/75">
        {tab === "builtin" ? "아직 준비된 기본 세트가 없어요" : "여기는 아직 비어 있어요"}
      </p>
      <p className="mt-2 text-sm text-[var(--ink)]/45">
        {tab === "builtin"
          ? "잠시 후 다시 확인해 주세요."
          : "엑셀 파일을 올리면 첫 세트가 만들어집니다."}
      </p>
    </div>
  );
}
