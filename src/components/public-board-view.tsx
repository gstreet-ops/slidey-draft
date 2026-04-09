"use client";

import { useState } from "react";
import { PublicPickCard } from "./public-pick-card";
import { ProspectDetailDrawer } from "./prospect-detail-drawer";

type PickData = {
  id: string;
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  playerImageUrl: string | null;
  playerNotes: string | null;
  playerHeight: string | null;
  playerWeight: number | null;
  playerRank: number | null;
  playerGrade: number | null;
  playerPositionRank: number | null;
  playerFortyTime: number | null;
  playerVertical: number | null;
  playerBenchPress: number | null;
  playerBroadJump: number | null;
  playerThreeConeDrill: number | null;
  playerShuttle: number | null;
  playerNflComparison: string | null;
  playerSchoolLogoUrl: string | null;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl: string | null;
  autoFilled: boolean | null;
  analysis: string | null;
};

type ScoreData = {
  pickNumber: number;
  matchType: string;
};

type ResultData = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
};

export function PublicBoardView({
  picks,
  scoreMap,
  resultMap,
}: {
  picks: PickData[];
  scoreMap: Record<number, ScoreData>;
  resultMap: Record<number, ResultData>;
}) {
  const [selectedProspect, setSelectedProspect] = useState<PickData | null>(null);

  return (
    <>
      <div className="space-y-2">
        {picks.map((pick) => {
          const score = scoreMap[pick.pickNumber];
          const result = resultMap[pick.pickNumber];

          return (
            <PublicPickCard
              key={pick.id}
              pick={pick}
              score={
                score
                  ? {
                      matchType: score.matchType,
                      actualPlayerName: result?.playerName,
                      actualPlayerPosition: result?.playerPosition,
                      actualPlayerSchool: result?.playerSchool,
                    }
                  : undefined
              }
              onPlayerClick={() => setSelectedProspect(pick)}
            />
          );
        })}
      </div>

      <ProspectDetailDrawer
        prospect={
          selectedProspect
            ? {
                name: selectedProspect.playerName,
                position: selectedProspect.playerPosition,
                school: selectedProspect.playerSchool,
                rank: selectedProspect.playerRank,
                height: selectedProspect.playerHeight,
                weight: selectedProspect.playerWeight,
                imageUrl: selectedProspect.playerImageUrl,
                notes: selectedProspect.playerNotes,
                grade: selectedProspect.playerGrade,
                positionRank: selectedProspect.playerPositionRank,
                fortyTime: selectedProspect.playerFortyTime,
                vertical: selectedProspect.playerVertical,
                benchPress: selectedProspect.playerBenchPress,
                broadJump: selectedProspect.playerBroadJump,
                threeConeDrill: selectedProspect.playerThreeConeDrill,
                shuttle: selectedProspect.playerShuttle,
                nflComparison: selectedProspect.playerNflComparison,
                schoolLogoUrl: selectedProspect.playerSchoolLogoUrl,
              }
            : null
        }
        onClose={() => setSelectedProspect(null)}
      />
    </>
  );
}
