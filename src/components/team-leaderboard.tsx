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
    return <div className="text-center py-8 text-gray-400 text-sm">Loading team standings…</div>;
  }

  if (ranked.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No teams have been created yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ranked.map((team) => (
        <div
          key={team.id}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-4 px-4 py-3">
            {/* Rank */}
            <div className="w-7 text-center font-bold text-gray-400 text-sm">
              #{team.rank}
            </div>

            {/* Color dot + name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.colorHex }} />
              <span className="font-semibold text-gray-800 truncate">{team.name}</span>
            </div>

            {/* Score */}
            <div className="font-bold text-gray-900 tabular-nums">{team.totalScore}</div>
          </div>

          {/* Score bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${maxScore > 0 ? (team.totalScore / maxScore) * 100 : 0}%`,
                backgroundColor: team.colorHex,
              }}
            />
          </div>

          {/* Members */}
          {team.members.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5">
              {team.members.map((m) => {
                const score = scoreMap.get(m.userId) ?? 0;
                return (
                  <span
                    key={m.userId}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                  >
                    <span>{m.userName}</span>
                    <span className="font-semibold text-gray-800">{score}</span>
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
