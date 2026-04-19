"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamImage } from "@/components/team-image";
import { createAdditionalUserBoard, setEntryBoard } from "@/lib/actions";
import type { LetterGrade } from "@/lib/mock-grading";

export type MyBoardCard = {
  boardId: string;
  title: string;
  status: "draft" | "published" | "locked" | "final";
  pickCount: number;
  isEntry: boolean;
  grade: LetterGrade | null;
};

type Props = {
  boards: MyBoardCard[];
  favoriteTeamCode: string | null;
  favoriteTeamName: string | null;
};

function gradeBadgeColors(grade: LetterGrade): string {
  switch (grade) {
    case "A+":
    case "A":
      return "bg-green-100 text-green-700 border-green-200";
    case "B+":
    case "B":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "C+":
    case "C":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "D":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "F":
      return "bg-red-100 text-red-700 border-red-200";
  }
}

export function MyDraftsSection({ boards, favoriteTeamCode, favoriteTeamName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyBoardId, setBusyBoardId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleSetEntry(boardId: string) {
    setErr(null);
    setBusyBoardId(boardId);
    startTransition(async () => {
      try {
        await setEntryBoard(boardId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to set entry draft");
      } finally {
        setBusyBoardId(null);
      }
    });
  }

  function handleCreateNew() {
    setErr(null);
    setBusyBoardId("__new__");
    startTransition(async () => {
      try {
        const board = await createAdditionalUserBoard(2026);
        router.push(`/mock-drafts/${board.id}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to create new draft");
        setBusyBoardId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {err && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          {err}
        </div>
      )}
      {boards.map((b) => (
        <article
          key={b.boardId}
          className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
            b.isEntry
              ? "border-l-4 border-l-[var(--accent-primary)] border-y-gray-200 border-r-gray-200"
              : "border-gray-200 hover:border-[var(--accent-primary)]/40"
          }`}
        >
          <Link
            href={`/mock-drafts/${b.boardId}`}
            className="flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5 sm:py-4"
          >
            <div className="shrink-0">
              <TeamImage
                teamCode={favoriteTeamCode}
                variant="logo"
                size={36}
                fallback="initials"
                className="h-9 w-9"
                alt={favoriteTeamName ?? b.title}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">
                  {b.title}
                </h3>
                {b.isEntry && (
                  <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                    Entry
                  </span>
                )}
                {b.status === "published" && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                    Published
                  </span>
                )}
                {b.status === "draft" && b.pickCount > 0 && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-700">
                    Draft
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
                {b.pickCount}/32 picks · tap to edit
              </p>
            </div>

            {b.grade && (
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${gradeBadgeColors(b.grade)}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {b.grade}
              </div>
            )}
          </Link>

          {!b.isEntry && (
            <div className="border-t border-gray-100 px-4 py-2 sm:px-5">
              <button
                type="button"
                onClick={() => handleSetEntry(b.boardId)}
                disabled={isPending && busyBoardId === b.boardId}
                className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition disabled:opacity-50"
              >
                {isPending && busyBoardId === b.boardId ? "Setting…" : "Set as Entry"}
              </button>
            </div>
          )}
        </article>
      ))}

      <button
        type="button"
        onClick={handleCreateNew}
        disabled={isPending && busyBoardId === "__new__"}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)] transition disabled:opacity-50"
      >
        {isPending && busyBoardId === "__new__" ? "Creating…" : "+ Create New Draft"}
      </button>
    </div>
  );
}
