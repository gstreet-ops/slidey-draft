"use client";

import { useState, useEffect } from "react";
import {
  generateCommissionerInvite,
  getCommissionerInvites,
  revokeCommissionerInvite,
  getCommissioners,
  demoteCommissioner,
} from "@/lib/actions";

type Invite = {
  id: string;
  code: string;
  poolName: string | null;
  createdAt: Date;
  expiresAt: Date;
  usedBy: string | null;
  usedAt: Date | null;
  usedByName: string | null;
  usedByEmail: string | null;
};

type Commissioner = {
  id: string;
  name: string | null;
  email: string;
  poolCount: number;
  totalMembers: number;
};

export function AdminCommissionerPanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [commissioners, setCommissioners] = useState<Commissioner[]>([]);
  const [poolName, setPoolName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [inv, comm] = await Promise.all([
      getCommissionerInvites(),
      getCommissioners(),
    ]);
    setInvites(inv as Invite[]);
    setCommissioners(comm as Commissioner[]);
  }

  async function handleGenerate() {
    setGenerating(true);
    const invite = await generateCommissionerInvite(poolName || undefined);
    setGeneratedLink(`https://slidey-draft.vercel.app/commissioner/${invite.code}`);
    setPoolName("");
    await loadData();
    setGenerating(false);
  }

  async function handleRevoke(id: string) {
    await revokeCommissionerInvite(id);
    await loadData();
  }

  async function handleDemote(userId: string) {
    if (!confirm("Demote this commissioner back to regular user? Their pools will remain.")) return;
    await demoteCommissioner(userId);
    await loadData();
  }

  function getStatus(invite: Invite) {
    if (invite.usedBy) return { label: "Used", color: "bg-green-100 text-green-700" };
    if (new Date(invite.expiresAt) < new Date()) return { label: "Expired", color: "bg-red-100 text-red-700" };
    return { label: "Pending", color: "bg-yellow-100 text-yellow-700" };
  }

  return (
    <div className="space-y-8">
      {/* Generate */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Generate Commissioner Invite</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            placeholder="Suggested pool name (optional)"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--slidey)] focus:outline-none"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-[var(--slidey)] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:opacity-80 transition disabled:opacity-50"
          >
            {generating ? "..." : "Generate"}
          </button>
        </div>

        {generatedLink && (
          <div className="rounded-lg border border-[var(--slidey)]/30 bg-[var(--slidey)]/10 p-4 space-y-2">
            <p className="text-xs text-[var(--text-muted)]">Share this link:</p>
            <code className="block text-sm text-[var(--slidey)] break-all">{generatedLink}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Copy link
            </button>
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">Pre-written message:</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                I&apos;m inviting you to run a draft pool on Slidey! Set up your pool here: {generatedLink}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`I'm inviting you to run a draft pool on Slidey! Set up your pool here: ${generatedLink}`);
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition mt-1"
              >
                Copy message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Table */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Commissioner Invites</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Pool Name</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Used By</th>
                  <th className="pb-2 pr-3">Created</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                {invites.map((inv) => {
                  const status = getStatus(inv);
                  return (
                    <tr key={inv.id} className="border-t border-[var(--border-light)]">
                      <td className="py-2 pr-3 font-mono text-xs">{inv.code}</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{inv.poolName || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{inv.usedByName || inv.usedByEmail || "—"}</td>
                      <td className="py-2 pr-3 text-xs text-[var(--text-muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        {!inv.usedBy && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="text-xs text-red-700 hover:text-red-700 transition"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissioners Table */}
      {commissioners.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Active Commissioners</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Pools</th>
                  <th className="pb-2 pr-3">Members</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                {commissioners.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--border-light)]">
                    <td className="py-2 pr-3">{c.name || "—"}</td>
                    <td className="py-2 pr-3 text-xs text-[var(--text-muted)]">{c.email}</td>
                    <td className="py-2 pr-3">{c.poolCount}</td>
                    <td className="py-2 pr-3">{c.totalMembers}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDemote(c.id)}
                        className="text-xs text-red-700 hover:text-red-700 transition"
                      >
                        Demote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
