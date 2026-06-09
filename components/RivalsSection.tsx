"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatAmount, getCurrentWeek } from "@/lib/utils";

interface RivalsSectionProps {
  maxRivals?: number;
  user?: {
    currentWeekDonated?: number;
    rivals?: string[];
  } | null;
}

interface RivalLeaderboardDoc {
  amount?: number;
  displayName?: string;
  userId?: string;
}

export default function RivalsSection({ maxRivals = 5, user }: RivalsSectionProps) {
  const [rivals, setRivals] = useState<RivalLeaderboardDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const rivalIds = useMemo(
    () => (Array.isArray(user?.rivals) ? user.rivals.slice(0, maxRivals) : []),
    [maxRivals, user?.rivals],
  );
  const rivalIdsKey = rivalIds.join("|");
  const yourAmount = user?.currentWeekDonated ?? 0;

  useEffect(() => {
    async function loadRivals() {
      setIsLoading(true);

      try {
        const week = getCurrentWeek();
        const rivalDocs = await Promise.all(
          rivalIds.map(async (rivalId) => {
            const snapshot = await getDoc(
              doc(db, "leaderboard_weekly", `${week}_${rivalId}`),
            );

            if (!snapshot.exists()) {
              return {
                amount: 0,
                displayName: "Rival",
                userId: rivalId,
              };
            }

            return snapshot.data() as RivalLeaderboardDoc;
          }),
        );

        setRivals(rivalDocs);
      } catch (error) {
        console.log("Rivals fetch error:", error);
        setRivals([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadRivals();
  }, [rivalIds, rivalIdsKey]);

  return (
    <section className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1f1f2e]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[11px] uppercase tracking-widest text-[#444455]">
          Rivals
        </h2>
        <span className="text-[11px] font-medium text-[#f0c040]/70 transition-colors hover:text-[#f0c040]">
          View All
        </span>
      </div>

      {isLoading ? (
        <div className="mt-4 flex min-h-24 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border border-white/10 border-t-[#f0c040]" />
        </div>
      ) : rivals.length === 0 ? (
        <p className="mt-4 text-[13px] leading-5 text-[#888899]">
          No rivals yet. Add rivals from the leaderboard!
        </p>
      ) : (
        <div className="mt-4">
          {rivals.map((rival) => {
            const rivalAmount = rival.amount ?? 0;
            const difference = Math.abs(yourAmount - rivalAmount);
            const comparison =
              yourAmount > rivalAmount
                ? {
                    className: "text-green-400",
                    text: `+${formatAmount(difference)}`,
                  }
                : rivalAmount > yourAmount
                  ? {
                      className: "text-red-400",
                      text: `-${formatAmount(difference)}`,
                    }
                  : {
                      className: "text-[#888899]",
                      text: "Even",
                    };

            return (
              <div
                className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-3 last:border-b-0"
                key={rival.userId}
              >
                <p className="truncate text-[13px] font-medium text-[#f0f0f0]">
                  {rival.displayName ?? "Rival"}
                </p>
                <p className={`shrink-0 text-[13px] font-medium ${comparison.className}`}>
                  {comparison.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
