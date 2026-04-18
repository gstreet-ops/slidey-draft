"use client";

import { useState, useEffect, useCallback } from "react";

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

interface Standing {
  userId: string;
  combinedScore: number;
}

interface RankedTeam extends Team {
  totalScore: number;
  rank: number;
}

interface Props {
  poolId: string;
  standings?: Standing[];
}

export function TeamLeaderboard({ poolId, standings }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [localStandings, setLocalStandings] = useState<Standing[]>(standings ?? []);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const teamsRes = await fetch(`/api/pools/${poolId}/teams`);
    const teamsData = await teamsRes.json();
    setTeams(teamsData.teams ?? []);
    setLoading(false);
  }, [poolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (standings) setLocalStandings(standings);
  }, [standings]);

  const scoreMap = new Map(localStandings.map((s) => [s.userId, s.combinedScore]));

  const ranked: RankedTeam[] = teams
    .map((team) => ({
      ...team,
      totalScore: team.members.reduce((sum, m) => sum + (scoreMap.get(m.userId) ?? 0), 0),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((team, i) => ({ ...team, rank: i + 1 }));

  const maxScore = ranked[0]?.totalScore ?? 1;

  if (loading) {
    return <div className="text-center py-4 text-[var(--text-muted)] text-sm">Loading teams…</div>;
  }

  if (ranked.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Team Standings</h3>
      {ranked.map((team) => (
        <div
          key={team.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-5 text-center text-sm font-bold text-[var(--text-secondary)]">
              {team.rank}
            </span>
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: team.colorHex }}
            />
            <span className="font-semibold text-[var(--text-primary)] truncate flex-1">{team.name}</span>
            <span className="text-lg font-bold text-[var(--text-primary)]">{team.totalScore}</span>
          </div>

          <div className="h-1 bg-[var(--bg-card)]">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${maxScore > 0 ? (team.totalScore / maxScore) * 100 : 0}%`,
                backgroundColor: team.colorHex,
              }}
            />
          </div>

          {team.members.length > 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5">
              {team.members.map((m) => {
                const score = scoreMap.get(m.userId) ?? 0;
                return (
                  <span
                    key={m.userId}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)]"
                  >
                    {m.userName}
                    <span className="font-bold text-[var(--text-primary)]">{score}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
