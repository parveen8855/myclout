/* eslint-disable @typescript-eslint/no-explicit-any */

import { BADGES, STAGES } from "@/types";

type LeaderboardFilterType = "district" | "state" | "national";

function addBadge(badges: string[], badgeId: string) {
  if (!badges.includes(badgeId)) {
    badges.push(badgeId);
  }
}

export function checkAndAwardBadges(
  user: any,
  leaderboardRank: number,
  totalInLeaderboard: number,
  filterType?: LeaderboardFilterType,
) {
  const badges = Array.isArray(user?.badges) ? [...user.badges] : [];

  if (user?.totalDonated > 0) {
    addBadge(badges, BADGES.FIRST_BLOOD.id);
  }

  if (user?.streak >= 4) {
    addBadge(badges, BADGES.WEEK_WARRIOR.id);
  }

  if (leaderboardRank === 1 && filterType === "district") {
    addBadge(badges, BADGES.DISTRICT_DOMINATOR.id);
  }

  if (leaderboardRank <= 5 && filterType === "state") {
    addBadge(badges, BADGES.STATE_SENTINEL.id);
  }

  if (leaderboardRank === 1 && user?.isAnonymous) {
    addBadge(badges, BADGES.GHOST_LEGEND.id);
  }

  if (leaderboardRank === 1 && filterType === "national") {
    addBadge(badges, BADGES.HALL_OF_FAMER.id);
  }

  return totalInLeaderboard > 0 ? badges : Array.from(new Set(badges));
}

export function getUserStage(rankPercent: number) {
  return [...STAGES]
    .reverse()
    .find((stage) => rankPercent <= stage.minRankPercent) ?? STAGES[0];
}
