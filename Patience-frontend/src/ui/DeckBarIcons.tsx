import type { ReactNode } from "react";

/** Inline SVGs for the decks bottom bar — no external URLs. */

function IconShell({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Straight arrow — start in order */
export function OrderIcon() {
  return (
    <IconShell>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconShell>
  );
}

/** Crossed arrows — shuffle / random */
export function ShuffleIcon() {
  return (
    <IconShell>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </IconShell>
  );
}

/** Duplicate pages — copy builtin to my decks */
export function CopyIcon() {
  return (
    <IconShell>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </IconShell>
  );
}

/** Pencil — edit */
export function EditIcon() {
  return (
    <IconShell>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconShell>
  );
}

/** Spreadsheet sheet — excel export */
export function ExcelIcon() {
  return (
    <IconShell>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M10 13v4" />
    </IconShell>
  );
}

/** Trash can — delete */
export function TrashIcon() {
  return (
    <IconShell>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconShell>
  );
}
