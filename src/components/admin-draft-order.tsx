"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { recordManualTrade, revertTrade } from "@/lib/actions";
import { forceSyncDraftOrder } from "@/lib/draft-order-sync";
import { TradeIndicator } from "@/components/trade-indicator";

export type AdminDraftSlot = {
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamLogoUrl: string | null;
  originalTeamId: string | null;
};

export type AdminTradeRow = {
  id: string;
  pickNumber: number;
  previousTeamAbbreviation: string;
  newTeamAbbreviation: string;
  tradeNote: string | null;
  source: "espn_sync" | "manual";
  detectedAt: string;
};

export type AdminTeamOption = {
  id: string;
  abbreviation: string;
  name: string;
};

type Props = {
  season: number;
  slots: AdminDraftSlot[];
  trades: AdminTradeRow[];
  teams: AdminTeamOption[];
  /** Keyed by pickNumber — the most recent trade (matches TradeIndicator surface) */
  tradesByPick: Record<number, { tradeId: string; previousTeamAbbreviation: string; newTeamAbbreviation: string }>;
  /** ISO string of the last successful ESPN sync, or null if never synced. */
  lastEspnSyncAt: string | null;
};

export function AdminDraftOrder({ season, slots, trades, teams, tradesByPick, lastEspnSyncAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickNumber, setPickNumber] = useState<number>(1);
  const [newTeamAbbr, setNewTeamAbbr] = useState<string>("");
  const [tradeNote, setTradeNote] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function onSyncNow() {
    setErr(null);
    setFlash(null);
    setSyncResult(null);
    startTransition(async () => {
      try {
        const res = await forceSyncDraftOrder(season);
        if (!res.ok) {
          setSyncResult(`Sync failed: ${res.error}`);
        } else if (res.tradesDetected === 0) {
          setSyncResult("No changes detected — draft order matches ESPN.");
        } else {
          setSyncResult(
            `${res.tradesDetected} trade${res.tradesDetected === 1 ? "" : "s"} detected on pick${
              res.updatedPicks.length === 1 ? "" : "s"
            } ${res.updatedPicks.map((p) => `#${p}`).join(", ")}.`
          );
        }
        router.refresh();
      } catch (e) {
        setSyncResult(`Sync failed: ${(e as Error).message}`);
      }
    });
  }

  const lastSyncLabel = lastEspnSyncAt
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(lastEspnSyncAt)) + " ET"
    : "never";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setFlash(null);
    if (!newTeamAbbr) {
      setErr("Pick a team to trade to.");
      return;
    }
    startTransition(async () => {
      try {
        await recordManualTrade({
          season,
          pickNumber,
          newTeamAbbreviation: newTeamAbbr,
          tradeNote: tradeNote.trim() || null,
        });
        setFlash(`Recorded: #${pickNumber} → ${newTeamAbbr}`);
        setNewTeamAbbr("");
        setTradeNote("");
        router.refresh();
      } catch (e) {
        setErr((e as Error).message || "Failed to record trade");
      }
    });
  }

  function onRevert(tradeId: string) {
    setErr(null);
    setFlash(null);
    startTransition(async () => {
      try {
        await revertTrade(tradeId);
        setFlash("Trade reverted.");
        router.refresh();
      } catch (e) {
        setErr((e as Error).message || "Failed to revert");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">Record a trade</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Updates the draft order and appends a manual entry to the trade log. Use
          this when ESPN hasn&apos;t picked up a trade yet or for corrections.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Pick #
              </label>
              <select
                value={pickNumber}
                onChange={(e) => setPickNumber(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                {slots.map((s) => (
                  <option key={s.pickNumber} value={s.pickNumber}>
                    #{s.pickNumber} — {s.teamAbbreviation}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                New team
              </label>
              <select
                value={newTeamAbbr}
                onChange={(e) => setNewTeamAbbr(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="">Pick a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.abbreviation}>
                    {t.name} ({t.abbreviation})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-[38px] rounded-lg bg-[var(--accent-primary)] px-5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Record Trade"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={tradeNote}
              onChange={(e) => setTradeNote(e.target.value)}
              placeholder="e.g. NYG traded #5 to LAR for #14 + 2025 2nd"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
          {flash && <p className="text-xs text-green-700 font-semibold">{flash}</p>}
        </form>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
              Round 1 order — {season}
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Last ESPN sync: {lastSyncLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isPending}
              className="rounded-lg border border-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-text)] transition disabled:opacity-50"
            >
              {isPending ? "Syncing…" : "Sync Now"}
            </button>
            <Link href="/trades" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
              View trade log →
            </Link>
          </div>
        </div>
        {syncResult && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">{syncResult}</p>
        )}
        <ol className="mt-3 divide-y divide-gray-100">
          {slots.map((s) => (
            <li key={s.pickNumber} className="flex items-center gap-3 py-2">
              <span
                className="w-8 shrink-0 text-right text-xs font-mono font-bold text-[var(--text-muted)]"
                aria-label={`Pick number ${s.pickNumber}`}
              >
                #{s.pickNumber}
              </span>
              {s.teamLogoUrl ? (
                <Image
                  src={s.teamLogoUrl}
                  alt={s.teamAbbreviation}
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 object-contain"
                />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded bg-gray-200" />
              )}
              <span className="text-sm font-semibold text-[var(--text-primary)] w-10 shrink-0">
                {s.teamAbbreviation}
              </span>
              <span className="text-xs text-[var(--text-muted)] truncate">{s.teamName}</span>
              {tradesByPick[s.pickNumber] && (
                <TradeIndicator
                  tradeId={tradesByPick[s.pickNumber].tradeId}
                  previousTeamAbbreviation={tradesByPick[s.pickNumber].previousTeamAbbreviation}
                  newTeamAbbreviation={tradesByPick[s.pickNumber].newTeamAbbreviation}
                  size={11}
                  className="ml-auto shrink-0"
                />
              )}
            </li>
          ))}
        </ol>
      </div>

      {trades.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">Recent trades</h3>
          <ul className="mt-3 space-y-2">
            {trades.slice(0, 10).map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-10 shrink-0">#{t.pickNumber}</span>
                <span className="text-[var(--text-secondary)]">
                  {t.previousTeamAbbreviation} → <span className="font-semibold text-[var(--text-primary)]">{t.newTeamAbbreviation}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {t.source === "manual" ? "Manual" : "ESPN"}
                </span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">{t.detectedAt}</span>
                <button
                  type="button"
                  onClick={() => onRevert(t.id)}
                  disabled={isPending}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition disabled:opacity-50"
                >
                  Revert
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
