"use client";

import { useState, useEffect } from "react";
import {
  generatePoolInviteCodes,
  getPoolInviteCodes,
  revokePoolInviteCode,
} from "@/lib/actions";

type InviteCode = {
  id: string;
  code: string;
  type: string;
  usedBy: string | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  usedByName: string | null;
  usedByEmail: string | null;
};

export function PoolInviteManager({
  poolId,
  poolName,
  openInviteCode,
  memberCount,
}: {
  poolId: string;
  poolName: string;
  openInviteCode: string;
  memberCount: number;
}) {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    const result = await getPoolInviteCodes(poolId);
    setCodes(result as InviteCode[]);
  }

  async function handleGenerate() {
    setGenerating(true);
    const newCodes = await generatePoolInviteCodes(poolId, 1);
    const link = `https://slidey-draft.vercel.app/join/${newCodes[0].code}`;
    setGeneratedLink(link);
    await loadCodes();
    setGenerating(false);
  }

  async function handleBulkGenerate() {
    setBulkGenerating(true);
    await generatePoolInviteCodes(poolId, 5);
    await loadCodes();
    setBulkGenerating(false);
  }

  async function handleRevoke(codeId: string) {
    await revokePoolInviteCode(codeId);
    await loadCodes();
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const usedCount = codes.filter((c) => c.usedBy).length;
  const pendingCount = codes.filter((c) => !c.usedBy && !c.revokedAt).length;

  function getStatus(code: InviteCode) {
    if (code.usedBy) return { label: "Used", color: "bg-green-500/20 text-green-400" };
    if (code.revokedAt) return { label: "Revoked", color: "bg-red-500/20 text-red-400" };
    return { label: "Pending", color: "bg-yellow-500/20 text-yellow-400" };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Invite Players</h3>
        </div>
        <span className="text-xs text-white/40">
          {usedCount} of {codes.length} invites used · {memberCount} member{memberCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Open invite link */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
        <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">Shared Pool Link (unlimited joins)</p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-[var(--gtown-highlight)] break-all flex-1">
            https://slidey-draft.vercel.app/join/{openInviteCode}
          </code>
          <button
            onClick={() => copyToClipboard(`https://slidey-draft.vercel.app/join/${openInviteCode}`, "open")}
            className="shrink-0 rounded-md bg-[var(--gtown-highlight)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80 transition"
          >
            {copied === "open" ? "Copied!" : "Copy"}
          </button>
        </div>
        <button
          onClick={() =>
            copyToClipboard(
              `Join my draft pool "${poolName}" on Slidey! 🏈 https://slidey-draft.vercel.app/join/${openInviteCode}`,
              "open-msg"
            )
          }
          className="text-xs text-white/50 hover:text-white/60 transition"
        >
          {copied === "open-msg" ? "Message copied!" : "Copy share message"}
        </button>
      </div>

      {/* Generate personal invite codes */}
      <div className="space-y-3">
        <p className="text-xs text-white/50">
          Personal invites are single-use — each code works for one player only.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-[var(--slidey)] px-5 py-2 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-50"
          >
            {generating ? "..." : "Generate Invite Link"}
          </button>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-white/60 hover:border-white/40 hover:text-white transition disabled:opacity-50"
          >
            {bulkGenerating ? "..." : "Generate 5 Codes"}
          </button>
        </div>
      </div>

      {/* Generated link display */}
      {generatedLink && (
        <div className="rounded-lg border border-[var(--slidey)]/30 bg-[var(--slidey)]/10 p-4 space-y-2">
          <p className="text-xs text-white/50">Share this link (single-use):</p>
          <code className="block text-sm text-[var(--slidey)] break-all">{generatedLink}</code>
          <div className="flex gap-4">
            <button
              onClick={() => copyToClipboard(generatedLink, "gen")}
              className="text-xs text-white/60 hover:text-white transition"
            >
              {copied === "gen" ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() =>
                copyToClipboard(
                  `Join my draft pool "${poolName}" on Slidey! 🏈 ${generatedLink}`,
                  "gen-msg"
                )
              }
              className="text-xs text-white/60 hover:text-white transition"
            >
              {copied === "gen-msg" ? "Copied!" : "Copy message"}
            </button>
          </div>
        </div>
      )}

      {/* Invite codes table */}
      {codes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white">Personal Invite Codes</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/50 uppercase tracking-wider">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Used By</th>
                  <th className="pb-2 pr-3">Created</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {codes.map((c) => {
                  const status = getStatus(c);
                  const link = `https://slidey-draft.vercel.app/join/${c.code}`;
                  return (
                    <tr key={c.id} className={`border-t border-white/5 ${c.usedBy || c.revokedAt ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-3 font-mono text-xs">{c.code}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{c.usedByName || c.usedByEmail || "—"}</td>
                      <td className="py-2 pr-3 text-xs text-white/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        {!c.usedBy && !c.revokedAt && (
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => copyToClipboard(link, c.id)}
                              className="text-xs text-[var(--slidey)] hover:underline"
                            >
                              {copied === c.id ? "Copied!" : "Copy"}
                            </button>
                            <button
                              onClick={() => handleRevoke(c.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition"
                            >
                              Revoke
                            </button>
                          </div>
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
    </div>
  );
}
