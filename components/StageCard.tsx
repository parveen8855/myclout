"use client";

import { getUserStage } from "@/lib/badges";
import { STAGES } from "@/types";

interface StageCardProps {
  rankPercent: number;
  user?: unknown;
}

function getProgressToNextStage(rankPercent: number) {
  const currentStage = getUserStage(rankPercent);
  const stagesByDifficulty = [...STAGES].sort(
    (a, b) => b.minRankPercent - a.minRankPercent,
  );
  const currentIndex = stagesByDifficulty.findIndex(
    (stage) => stage.name === currentStage.name,
  );
  const nextStage = stagesByDifficulty[currentIndex + 1];

  if (!nextStage) {
    return 100;
  }

  const currentThreshold = currentStage.minRankPercent;
  const nextThreshold = nextStage.minRankPercent;
  const progress =
    ((currentThreshold - rankPercent) / (currentThreshold - nextThreshold)) *
    100;

  return Math.max(0, Math.min(100, progress));
}

export default function StageCard({ rankPercent }: StageCardProps) {
  const stage = getUserStage(rankPercent);
  const progress = getProgressToNextStage(rankPercent);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center">
      <p className="text-sm text-[#888899]">Current Stage</p>
      <div className="mt-4 text-5xl">{stage.emoji}</div>
      <p className="mt-3 text-2xl font-bold text-[#f0c040]">{stage.name}</p>
      <p className="mt-2 text-sm text-[#888899]">
        Top {Math.max(1, Math.round(rankPercent))}% in your state
      </p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#f0c040] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
