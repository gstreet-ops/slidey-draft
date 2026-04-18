"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/lib/settings-actions";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { update } = useSession();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await updateDisplayName(name);
        await update();
        setStatus("saved");
        router.refresh();
        setTimeout(() => setStatus("idle"), 2500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  const dirty = name.trim() !== initialName.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
        Display Name
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          className="flex-1 rounded-lg border border-white/[0.12] bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-lg bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {status === "saved" && (
        <p className="text-xs text-green-400">Saved.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
