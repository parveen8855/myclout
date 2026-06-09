"use client";

import { useEffect, useState } from "react";
import RivalButton from "@/components/RivalButton";
import { getWeeklyLeaderboard } from "@/lib/firestore";
import { formatAmount } from "@/lib/utils";
import { type UserUpgrades } from "@/types";

type LeaderboardTab = "district" | "state" | "national";

interface LeaderboardEntry {
  userId?: string;
  displayName?: string;
  amount?: number;
  state?: string;
  district?: string;
  isAnonymous?: boolean;
  boostActive?: boolean;
  boostExpiry?: unknown;
  photoURL?: string;
  rank?: number;
  upgrades?: UserUpgrades;
}

interface LeaderboardProps {
  currentUserId?: string;
  state?: string;
  district?: string;
  refreshKey?: number;
}

const tabs: Array<{ label: string; value: LeaderboardTab }> = [
  { label: "District", value: "district" },
  { label: "State", value: "state" },
  { label: "National", value: "national" },
];

function getRankColor(rank: number) {
  if (rank === 1) {
    return "text-[#f0c040]";
  }

  if (rank === 2) {
    return "text-[#c0c0c0]";
  }

  if (rank === 3) {
    return "text-[#cd7f32]";
  }

  return "text-[#888899]";
}

function getFilterValue(tab: LeaderboardTab, state?: string, district?: string) {
  if (tab === "district") {
    return district;
  }

  if (tab === "state") {
    return state;
  }

  return undefined;
}

function getExpiryMillis(value: LeaderboardEntry["boostExpiry"]) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toDate" in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    return maybeTimestamp.toDate?.()?.getTime() ?? 0;
  }

  return 0;
}

function isBoostLive(entry: LeaderboardEntry) {
  return Boolean(entry.boostActive) && getExpiryMillis(entry.boostExpiry) > Date.now();
}

export default function Leaderboard({
  currentUserId,
  district,
  refreshKey,
  state,
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("district");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const filterValue = getFilterValue(activeTab, state, district);

      setIsLoading(true);

      try {
        if (activeTab !== "national" && !filterValue) {
          setEntries([]);
          return;
        }

        const data = await getWeeklyLeaderboard(activeTab, filterValue);
        setEntries(data as LeaderboardEntry[]);
      } catch (error) {
        console.log("Leaderboard fetch error:", error);
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaderboard();
  }, [activeTab, district, refreshKey, state]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24]">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-[#111118] p-1">
          {tabs.map((tab) => (
            <button
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? "bg-[#7c6af7] text-white"
                  : "text-[#888899] hover:text-white"
              }`}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center text-center text-sm text-[#888899]">
            No donations yet this week. Be the first!
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 50).map((entry, index) => {
              const rank = entry.rank ?? index + 1;
              const isCurrentUser = Boolean(
                currentUserId && entry.userId === currentUserId,
              );
              const displayName = entry.isAnonymous
                ? "👻 Anonymous"
                : entry.displayName ?? "WeClout User";
              const boostLive = isBoostLive(entry);
              const boldName = Boolean(entry.upgrades?.boldName);

              return (
                <div
                  className={`flex items-center gap-4 rounded-xl border p-3 transition ${
                    boostLive
                      ? "border-[#f0c040]/40 bg-[#f0c040]/10"
                      : isCurrentUser
                      ? "border-[#7c6af7]/70 bg-[#7c6af7]/10"
                      : "border-white/10 bg-[#111118]/70"
                  }`}
                  key={`${entry.userId ?? displayName}-${rank}`}
                >
                  <div
                    className={`w-9 shrink-0 text-center text-lg font-bold ${getRankColor(
                      rank,
                    )}`}
                  >
                    {rank}
                  </div>
                  <div
                    className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0c040]/10 bg-cover bg-center text-[13px] font-semibold text-[#f0c040] sm:flex ${
                      entry.upgrades?.animatedBorder ? "animated-profile-border" : ""
                    }`}
                    style={{
                      backgroundImage: entry.photoURL
                        ? `url(${entry.photoURL})`
                        : undefined,
                    }}
                  >
                    {!entry.photoURL &&
                      displayName.replace("👻 ", "").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate ${
                        boostLive ? "text-[#f0c040]" : "text-white"
                      } ${boldName ? "text-[15px] font-bold" : "font-semibold"}`}
                    >
                      {boostLive && "⚡ "}
                      {displayName}
                    </p>
                    {entry.upgrades?.badgeColor && (
                      <span
                        className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${entry.upgrades.badgeColor}18`,
                          color: entry.upgrades.badgeColor,
                        }}
                      >
                        Stage
                      </span>
                    )}
                    <p className="mt-1 truncate text-xs text-[#444455]">
                      {[entry.state, entry.district].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold text-[#f0c040]">
                    {formatAmount(entry.amount ?? 0)}
                  </p>
                  {!isCurrentUser && entry.userId && (
                    <RivalButton
                      targetName={displayName}
                      targetUserId={entry.userId}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
