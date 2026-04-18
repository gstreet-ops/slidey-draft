"use client";

import { useState, useEffect, useCallback } from "react";

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

interface TeamMember {
  userId: string;
  userName: string;
}

interface Team {
  id: string;
  name: string;
  colorHex: string;
  members: TeamMember[];
}

interface Props {
  poolId: string;
  poolMembers: { userId: string; userName: string }[];
}

export function PoolTeamManager({ poolId, poolMembers }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});

  const fetchTeams = useCallback(async () => {
    const res = await fetch(`/api/pools/${poolId}/teams`);
    const data = await res.json();
    setTeams(data.teams ?? []);
    setLoading(false);
  }, [poolId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const assignedUserIds = new Set(teams.flatMap((t) => t.members.map((m) => m.userId)));
  const unassignedMembers = poolMembers.filter((m) => !assignedUserIds.has(m.userId));

  async function createTeam() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch(`/api/pools/${poolId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), colorHex: newColor }),
    });
    setNewName("");
    setNewColor(PRESET_COLORS[5]);
    setShowCreateForm(false);
    setCreating(false);
    fetchTeams();
  }

  async function assignMember(teamId: string) {
    const userId = assignSelections[teamId];
    if (!userId) return;
    await fetch(`/api/pools/${poolId}/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setAssignSelections((prev) => ({ ...prev, [teamId]: "" }));
    fetchTeams();
  }

  async function removeMember(teamId: string, userId: string) {
    await fetch(`/api/pools/${poolId}/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchTeams();
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading teams…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Pool Teams</h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-[var(--text-primary)] text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Team
          </button>
        )}
      </div>

      {/* Create Team Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">New Team</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Team Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && createTeam()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? "#1e40af" : "transparent",
                    transform: newColor === color ? "scale(1.2)" : "scale(1)",
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createTeam}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-blue-600 text-[var(--text-primary)] text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewName(""); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team Cards */}
      {teams.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No teams yet. Create one to get started.
        </div>
      )}

      <div className="space-y-4">
        {teams.map((team) => {
          const available = poolMembers.filter(
            (m) => !assignedUserIds.has(m.userId)
          );
          return (
            <div key={team.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Team header bar */}
              <div className="h-1.5" style={{ backgroundColor: team.colorHex }} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.colorHex }} />
                  <span className="font-semibold text-gray-800">{team.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Member chips */}
                {team.members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m) => (
                      <span
                        key={m.userId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-[var(--text-primary)]"
                        style={{ backgroundColor: team.colorHex }}
                      >
                        {m.userName || "Unknown"}
                        <button
                          onClick={() => removeMember(team.id, m.userId)}
                          className="ml-0.5 opacity-70 hover:opacity-100 font-bold leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Assign member */}
                {available.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={assignSelections[team.id] ?? ""}
                      onChange={(e) =>
                        setAssignSelections((prev) => ({ ...prev, [team.id]: e.target.value }))
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Add member…</option>
                      {available.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.userName}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignMember(team.id)}
                      disabled={!assignSelections[team.id]}
                      className="px-3 py-1.5 bg-gray-800 text-[var(--text-primary)] text-sm rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned Members */}
      {unassignedMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Unassigned Members ({unassignedMembers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassignedMembers.map((m) => (
              <span
                key={m.userId}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-300"
              >
                {m.userName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
