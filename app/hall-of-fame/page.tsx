"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { db } from "@/lib/firebase";
import { getWeeklyChronicle } from "@/lib/hallOfFame";
import { updateUserDoc } from "@/lib/firestore";
import { getCurrentWeek } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { BADGES } from "@/types";

type HallTab = "legends" | "chronicle" | "states";

type LegendEntry = {
  id: string;
  badges?: string[];
  consecutiveWeeks?: number;
  displayName?: string;
  district?: string;
  isUndefeated?: boolean;
  state?: string;
  streak?: number;
  timestamp?: any;
  totalDonated?: number;
  weeklyAmount?: number;
  week?: string;
  userId?: string;
  type?: string;
};

type ChronicleEntry = {
  id: string;
  amount?: number;
  consecutiveWeeks?: number;
  displayName?: string;
  filterType?: string;
  state?: string;
  week?: string;
};

type CrownHistoryEntry = {
  id: string;
  newHolder?: string;
  previousHolder?: string;
  transferredAt?: unknown;
  newHolderState?: string;
  newHolderDistrict?: string;
};

type Star = {
  id: number;
  color: string;
  delay: number;
  drift: number;
  duration: number;
  opacity: number;
  size: number;
  x: number;
  y: number;
};

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
];

const tabs: Array<{ label: string; value: HallTab }> = [
  { label: "👑 Legends", value: "legends" },
  { label: "📅 Chronicle", value: "chronicle" },
  { label: "🗺️ State Wall", value: "states" },
];

const dummyLegends = [
  {
    badges: [
      "first_blood",
      "week_warrior",
      "district_dominator",
      "state_sentinel",
    ],
    consecutiveWeeks: 3,
    displayName: "Parveen Siwach",
    district: "Rewari",
    isUndefeated: true,
    state: "Haryana",
    streak: 4,
    timestamp: new Date(),
    totalDonated: 75400,
    type: "national_1",
    userId: "dummy1",
    week: getCurrentWeek(),
    weeklyAmount: 75400,
  },
  {
    badges: ["first_blood", "week_warrior"],
    consecutiveWeeks: 1,
    displayName: "Tanishq Nyati",
    district: "lol",
    state: "Bihar",
    streak: 6,
    timestamp: new Date(),
    totalDonated: 20500,
    type: "longest_streak",
    userId: "dummy2",
    week: getCurrentWeek(),
    weeklyAmount: 20500,
  },
  {
    badges: ["first_blood", "ghost_legend"],
    consecutiveWeeks: 1,
    displayName: "Arjun Malhotra",
    district: "South Delhi",
    state: "Delhi",
    streak: 2,
    timestamp: new Date(),
    totalDonated: 52000,
    type: "national_1",
    userId: "dummy3",
    week: "2026-W20",
    weeklyAmount: 52000,
  },
];

function getBadgeLabel(badgeId: string) {
  const badgeKey = badgeId.toUpperCase() as keyof typeof BADGES;
  const badge = BADGES[badgeKey];

  return `${badge?.emoji || "🏅"} ${badgeId.replace(/_/g, " ")}`;
}

function getInitial(name?: string) {
  return (name || "W").replace("👻 ", "").charAt(0).toUpperCase();
}

function formatAmount(amount?: number) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

function toDisplayDate(value?: unknown) {
  const date = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : (value as { toDate?: () => Date } | undefined)?.toDate?.();

  if (!date || Number.isNaN(date.getTime())) {
    return "just now";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, index) => ({
    color: index % 5 === 0 ? "#f0c040" : index % 7 === 0 ? "#ffe680" : "#ffffff",
    delay: Math.random() * 3,
    drift: Math.random() * 36 + 12,
    duration: Math.random() * 4 + 4,
    id: index,
    opacity: Math.random() * 0.5 + 0.35,
    size: Math.random() * 2 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));
}

function HallStarField({
  className = "",
  count,
  entrance = false,
}: {
  className?: string;
  count: number;
  entrance?: boolean;
}) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(createStars(count));
  }, [count]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {stars.map((star) => (
        <span
          className={entrance ? "hof-entrance-star" : "hof-page-star"}
          key={`hof-star-${star.id}`}
          style={
            {
              "--star-delay": `${star.delay}s`,
              "--star-drift": `${star.drift}px`,
              "--star-duration": `${star.duration}s`,
              background: star.color,
              height: `${star.size}px`,
              left: `${star.x}%`,
              opacity: star.opacity,
              top: `${star.y}%`,
              width: `${star.size}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

async function seedDummyData() {
  const snap = await getDocs(collection(db, "hall_of_fame"));
  const hasUsableLegend = snap.docs.some(
    (legendDoc) => typeof legendDoc.data().totalDonated === "number",
  );

  if (hasUsableLegend) {
    return;
  }

  for (const legend of dummyLegends) {
    await setDoc(doc(db, "hall_of_fame", `seed_${legend.userId}`), legend, {
      merge: true,
    });
    await setDoc(
      doc(
        db,
        "weekly_chronicle",
        `${legend.week}_${legend.type}_${legend.userId}`,
      ),
      {
        amount: legend.weeklyAmount,
        badges: legend.badges,
        consecutiveWeeks: legend.consecutiveWeeks,
        createdAt: new Date(),
        displayName: legend.displayName,
        district: legend.district,
        filterType: legend.type === "national_1" ? "national" : "state",
        state: legend.state,
        streak: legend.streak,
        totalDonated: legend.totalDonated,
        userId: legend.userId,
        week: legend.week,
      },
      { merge: true },
    );
  }
}

function HallOfFameEntrance({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3500);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="hof-entrance-overlay fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      <div className="hof-expanding-glow" />
      <HallStarField count={150} entrance />

      {Array.from({ length: 3 }).map((_, index) => (
        <span
          className="hof-shooting-star"
          key={`hof-shooting-star-${index}`}
          style={{
            animationDelay: `${1.25 + index * 0.22}s`,
            top: `${18 + index * 18}%`,
          }}
        />
      ))}

      <div className="hof-title-stage text-center">
        <h1 className="hof-crash-title">HALL OF FAME</h1>
        <div className="hof-gold-line" />
        <p className="hof-crash-subtitle">
          Where legends live forever
        </p>
      </div>

      <button
        className="hof-skip-button"
        onClick={onSkip}
        type="button"
      >
        Skip →
      </button>
    </div>
  );
}

function LegendMeter({
  currentTotal,
  legends,
}: {
  currentTotal: number;
  legends: LegendEntry[];
}) {
  const target = Math.max(
    75000,
    ...legends.map((legend) => legend.totalDonated ?? 0),
  );
  const legendPercent = Math.min(
    100,
    Math.round((currentTotal / Math.max(target, 1)) * 100),
  );
  const amountNeeded = Math.max(0, target - currentTotal);

  return (
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5">
      <div className="mb-3 flex justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-widest text-[#444455]">
            Your Legend Progress
          </p>
          <p className="text-[13px] text-[#f0f0f0]">
            {legendPercent}% to becoming a Legend
          </p>
        </div>
        <p className="text-right text-[11px] text-[#888899]">
          Need {formatAmount(amountNeeded)} more
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            background: "linear-gradient(90deg, #c8960c, #f0c040, #ffe680)",
            width: `${legendPercent}%`,
          }}
        />
      </div>
      <p className="mt-2 text-[11px] text-[#444455]">
        Top donor of any week = instant legend status
      </p>
    </div>
  );
}

function LegendCard({
  animationDelay,
  currentUserId,
  legend,
}: {
  animationDelay?: number;
  currentUserId?: string;
  legend: LegendEntry;
}) {
  async function challengeLegend() {
    if (!currentUserId) {
      toast.error("Login to challenge a legend.");
      return;
    }

    if (!legend.userId) {
      toast.error("This legend cannot be challenged yet.");
      return;
    }

    await updateUserDoc(currentUserId, {
      rivals: arrayUnion(legend.userId),
    });
    toast.success("⚔️ Challenge accepted! Beat them!");
  }

  return (
    <div
      className="card-shine hof-legend-card-in relative overflow-hidden rounded-2xl border border-[#f0c040]/15 bg-[#1a1a24] p-5"
      style={{ animationDelay: `${animationDelay ?? 0}s` }}
    >
      {legend.isUndefeated && (
        <div className="absolute right-0 top-0">
          <div className="rounded-bl-xl rounded-tr-xl bg-[#f0c040] px-3 py-1 text-[10px] font-bold text-black">
            👑 UNDEFEATED
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: "radial-gradient(circle at 30% 50%, #f0c040, transparent 60%)",
        }}
      />

      <div className="relative z-10">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[18px] font-bold"
            style={{
              background: "linear-gradient(135deg, #1a1500, #2a2000)",
              border: "1px solid rgba(240,192,64,0.2)",
              color: "#f0c040",
            }}
          >
            {getInitial(legend.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-[#f0f0f0]">
                {legend.displayName ?? "WeClout Legend"}
              </p>
              {(legend.consecutiveWeeks ?? 0) >= 3 && (
                <span className="text-[10px] text-[#f0c040]">👑</span>
              )}
            </div>
            <p className="text-[12px] text-[#888899]">
              {legend.district ?? "India"}, {legend.state ?? "WeClout"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-semibold text-[#f0c040]">
              {formatAmount(legend.totalDonated)}
            </p>
            <p className="text-[10px] text-[#444455]">total donated</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/[0.03] p-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#444455]">
              Week
            </p>
            <p className="text-[12px] font-medium text-[#f0f0f0]">
              {legend.week ?? getCurrentWeek()}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#444455]">
              Streak
            </p>
            <p className="text-[12px] font-medium text-[#f0f0f0]">
              {legend.streak || 1} 🔥
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#444455]">
              Weeks #1
            </p>
            <p className="text-[12px] font-medium text-[#f0c040]">
              {legend.consecutiveWeeks || 1}
            </p>
          </div>
        </div>

        {Boolean(legend.badges?.length) && (
          <div className="mb-4 flex flex-wrap gap-1">
            {legend.badges?.slice(0, 4).map((badge) => (
              <span
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#888899]"
                key={badge}
              >
                {getBadgeLabel(badge)}
              </span>
            ))}
          </div>
        )}

        <button
          className="w-full rounded-xl py-2 text-[12px] font-medium transition-all duration-200"
          onClick={challengeLegend}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = "rgba(240,192,64,0.15)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "rgba(240,192,64,0.08)";
          }}
          style={{
            background: "rgba(240,192,64,0.08)",
            border: "1px solid rgba(240,192,64,0.2)",
            color: "#f0c040",
          }}
          type="button"
        >
          ⚔️ Challenge This Legend
        </button>
      </div>
    </div>
  );
}

function DethronedSection({
  legends,
}: {
  legends: LegendEntry[];
}) {
  const dethroned = legends
    .filter((legend) => !legend.isUndefeated)
    .slice(0, 3);

  if (dethroned.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-red-300/70">
        💀 Dethroned
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {dethroned.map((legend) => (
          <div
            className="rounded-xl border border-white/[0.08] border-l-red-400/60 bg-[#1a1a24] p-4"
            key={`dethroned-${legend.id}`}
          >
            <p className="text-[13px] font-semibold text-[#f0f0f0]">
              {legend.displayName}
            </p>
            <p className="mt-1 text-[11px] text-[#888899]">
              Once ruled {legend.state ?? "India"}
            </p>
            <button
              className="mt-4 rounded-lg border border-red-400/20 px-3 py-2 text-[11px] font-medium text-red-300 transition hover:bg-red-400/10"
              type="button"
            >
              Make a comeback
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CrownHistorySection({
  crownHistory,
}: {
  crownHistory: CrownHistoryEntry[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">👑</span>
        <h2 className="text-[11px] uppercase tracking-widest text-[#444455]">
          Crown History
        </h2>
      </div>

      {crownHistory.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-6 text-[13px] text-[#888899]">
          No crown transfers yet. The first takeover will be written here.
        </div>
      ) : (
        <div className="space-y-3">
          {crownHistory.map((entry, index) => (
            <div className="flex items-start gap-4" key={entry.id}>
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#f0c040]/25 bg-[#f0c040]/10 text-sm">
                  👑
                </div>
                {index < crownHistory.length - 1 && (
                  <div className="mt-1 min-h-[34px] w-px flex-1 bg-[#f0c040]/15" />
                )}
              </div>
              <div className="card-shine flex-1 rounded-xl border border-[#f0c040]/15 bg-[#1a1a24] p-4">
                <p className="text-[13px] font-semibold text-[#f0f0f0]">
                  {entry.newHolder ?? "A WeClout legend"} took the crown from{" "}
                  {entry.previousHolder ?? "the previous holder"} on{" "}
                  {toDisplayDate(entry.transferredAt)}
                </p>
                <p className="mt-1 text-[11px] text-[#888899]">
                  {[entry.newHolderDistrict, entry.newHolderState]
                    .filter(Boolean)
                    .join(", ") || "WeClout leaderboard"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChronicleTab({
  chronicle,
  crownHistory,
}: {
  chronicle: ChronicleEntry[];
  crownHistory: CrownHistoryEntry[];
}) {
  return (
    <div>
      {chronicle.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-8 text-center text-[13px] text-[#888899]">
          No weekly chronicles yet. The first champion will write history.
        </div>
      ) : (
        <div className="space-y-3">
          {chronicle.map((entry, index) => (
            <div className="flex items-start gap-4" key={entry.id}>
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#f0c040]" />
                {index < chronicle.length - 1 && (
                  <div className="mt-1 min-h-[40px] w-px flex-1 bg-white/[0.06]" />
                )}
              </div>

              <div className="card-shine mb-3 flex-1 rounded-xl border border-white/[0.08] bg-[#1a1a24] p-4">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#f0f0f0]">
                      {entry.displayName ?? "WeClout Champion"}
                    </p>
                    <p className="text-[11px] text-[#888899]">
                      {entry.filterType ?? "national"} champion •{" "}
                      {entry.state ?? "India"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#f0c040]">
                      {formatAmount(entry.amount)}
                    </p>
                    <p className="text-[10px] text-[#444455]">{entry.week}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#444455]">
                  👑 Dominated {entry.filterType ?? "national"} leaderboard this week
                  {(entry.consecutiveWeeks ?? 0) > 1
                    ? ` • ${entry.consecutiveWeeks} weeks in a row!`
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CrownHistorySection crownHistory={crownHistory} />
    </div>
  );
}

function StateWall({
  legends,
  onSelectState,
}: {
  legends: LegendEntry[];
  onSelectState: (state: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {indianStates.map((state) => {
        const legend = legends.find((entry) => entry.state === state);

        return (
          <button
            className={`relative min-h-28 rounded-xl p-4 text-left transition ${
              legend
                ? "border border-[#f0c040]/15 bg-[#1a1a24] hover:border-[#f0c040]/30"
                : "border border-white/5 bg-[#0f0f0f] opacity-70 hover:opacity-100"
            }`}
            key={state}
            onClick={() => onSelectState(state)}
            type="button"
          >
            {legend && (
              <span className="absolute right-3 top-3 text-sm">👑</span>
            )}
            <p className="pr-6 text-[13px] font-semibold text-[#f0f0f0]">
              {state}
            </p>
            {legend ? (
              <>
                <p className="mt-3 truncate text-[11px] text-[#888899]">
                  {legend.displayName}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-[#f0c040]">
                  {formatAmount(legend.totalDonated)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[11px] text-[#444455]">Unclaimed 👑</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StateModal({
  legend,
  onClose,
  state,
}: {
  legend?: LegendEntry;
  onClose: () => void;
  state: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#444455]">
              State Wall
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">{state}</h2>
          </div>
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#888899] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {legend ? (
          <div className="mt-6 rounded-xl border border-[#f0c040]/20 bg-[#f0c040]/5 p-4">
            <p className="text-[15px] font-semibold text-[#f0f0f0]">
              👑 {legend.displayName}
            </p>
            <p className="mt-1 text-[12px] text-[#888899]">
              {legend.district}, {legend.state}
            </p>
            <p className="mt-4 text-[24px] font-semibold text-[#f0c040]">
              {formatAmount(legend.totalDonated)}
            </p>
            <p className="text-[11px] text-[#444455]">
              {legend.consecutiveWeeks || 1} weeks at #1
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#111118] p-4 text-[13px] text-[#888899]">
            No champion yet. This state is waiting for its first legend.
          </div>
        )}
      </div>
    </div>
  );
}

function LegendReveal({
  onClose,
  userName,
}: {
  onClose: () => void;
  userName?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.95)" }}
    >
      {Array.from({ length: 20 }).map((_, index) => (
        <div
          className="confetti-piece"
          key={`hof-confetti-${index}`}
          style={{
            animationDelay: `${(index % 5) * 0.08}s`,
            animationDuration: `${1 + (index % 7) * 0.22}s`,
            background: ["#f0c040", "#a78bfa", "#60a5fa", "#4ade80"][
              index % 4
            ],
            height: `${4 + (index % 5)}px`,
            left: `${(index * 17) % 100}vw`,
            width: `${4 + (index % 6)}px`,
          }}
        />
      ))}

      <div className="z-10 text-center">
        <div
          className="mb-4 text-[64px]"
          style={{ animation: "bounce 0.5s ease infinite alternate" }}
        >
          👑
        </div>
        <p className="mb-3 text-[12px] uppercase tracking-[0.3em] text-[#f0c040]/60">
          You have entered the
        </p>
        <h1 className="gold-shimmer mb-2 text-[42px] font-bold tracking-tight">
          Hall of Fame
        </h1>
        <p className="mb-8 text-[14px] text-[#888899]">
          Your name lives here forever, {userName ?? "Legend"}
        </p>
        <button
          className="rounded-xl px-8 py-3 text-[13px] font-semibold text-black"
          onClick={onClose}
          style={{ background: "#f0c040" }}
          type="button"
        >
          Claim Your Legend Status
        </button>
      </div>
    </div>
  );
}

export default function HallOfFamePage() {
  const currentUser = useAuthStore((store) => store.user);
  const [activeTab, setActiveTab] = useState<HallTab>("legends");
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [crownHistory, setCrownHistory] = useState<CrownHistoryEntry[]>([]);
  const [legends, setLegends] = useState<LegendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showLegendReveal, setShowLegendReveal] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [cardDelayBase, setCardDelayBase] = useState(0.1);

  const sortedLegends = useMemo(
    () =>
      [...legends].sort(
        (first, second) =>
          (second.totalDonated ?? 0) - (first.totalDonated ?? 0),
      ),
    [legends],
  );
  const selectedStateLegend = selectedState
    ? sortedLegends.find((legend) => legend.state === selectedState)
    : undefined;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const skippedBefore =
      window.localStorage.getItem("hof_skip_preference") === "true";

    if (prefersReducedMotion || skippedBefore) {
      setShowRevealAnimation(false);
      setCardDelayBase(0.1);
      return;
    }

    setShowRevealAnimation(true);
    setCardDelayBase(3.3);
  }, []);

  useEffect(() => {
    async function loadHallOfFame() {
      setLoading(true);

      try {
        await seedDummyData();
        const hallQuery = query(
          collection(db, "hall_of_fame"),
          orderBy("totalDonated", "desc"),
        );
        const hallSnap = await getDocs(hallQuery);
        const nextLegends = hallSnap.docs.map((hallDoc) => ({
          id: hallDoc.id,
          ...(hallDoc.data() as Omit<LegendEntry, "id">),
        }));
        const nextChronicle = (await getWeeklyChronicle()) as ChronicleEntry[];
        const crownHistoryQuery = query(
          collection(db, "crown_history"),
          orderBy("transferredAt", "desc"),
          limit(10),
        );
        const crownHistorySnap = await getDocs(crownHistoryQuery);
        const nextCrownHistory = crownHistorySnap.docs.map((historyDoc) => ({
          id: historyDoc.id,
          ...(historyDoc.data() as Omit<CrownHistoryEntry, "id">),
        }));

        setLegends(nextLegends);
        setChronicle(nextChronicle);
        setCrownHistory(nextCrownHistory);

        if (currentUser?.uid) {
          const isInHall = nextLegends.some(
            (legend) => legend.userId === currentUser.uid,
          );
          const hasEntered = window.localStorage.getItem("hasEnteredHOF");

          if (isInHall && !hasEntered) {
            setShowLegendReveal(true);
            window.localStorage.setItem("hasEnteredHOF", "true");
          }
        }
      } catch (error) {
        console.log("Hall of Fame load error:", error);
        toast.error("Unable to load Hall of Fame right now.");
      } finally {
        setLoading(false);
      }
    }

    loadHallOfFame();
  }, [currentUser?.uid]);

  function completeIntro() {
    setShowRevealAnimation(false);
  }

  function skipIntro() {
    window.localStorage.setItem("hof_skip_preference", "true");
    setShowRevealAnimation(false);
    setCardDelayBase(0.1);
  }

  function replayIntro() {
    setCardDelayBase(3.3);
    setShowRevealAnimation(true);
  }

  return (
    <PageTransition>
      {showRevealAnimation && (
        <HallOfFameEntrance onComplete={completeIntro} onSkip={skipIntro} />
      )}
      {showLegendReveal && (
        <LegendReveal
          onClose={() => setShowLegendReveal(false)}
          userName={currentUser?.name}
        />
      )}

      <main className="hof-page-bg min-h-screen overflow-hidden px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <HallStarField className="fixed" count={50} />
        <div
          className={`relative mx-auto max-w-6xl ${
            showRevealAnimation ? "hof-page-content-reveal" : "page-enter"
          }`}
        >
          <section className="relative pb-6 pt-10">
            <div className="hof-page-spotlight" />
            <div className="relative z-10">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f0c040]" />
                  <span className="text-[11px] uppercase tracking-widest text-[#444455]">
                    Hall of Fame
                  </span>
                </div>
                <button
                  className="rounded-full border border-[#f0c040]/15 bg-[#f0c040]/5 px-3 py-1.5 text-[11px] font-medium text-[#f0c040]/75 transition hover:border-[#f0c040]/30 hover:text-[#f0c040]"
                  onClick={replayIntro}
                  type="button"
                >
                  Replay intro
                </button>
              </div>
              <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f0f0] sm:text-[32px]">
                Where Legends Live Forever
              </h1>
              <p className="mt-2 text-[14px] text-[#888899]">
                These donors shaped WeClout history. Their names never fade.
              </p>
            </div>
          </section>

          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-[#1a1a24] p-1 sm:inline-flex sm:w-auto">
            {tabs.map((tab) => (
              <button
                className={`min-h-11 rounded-lg px-2 py-2 text-[12px] font-medium transition sm:min-h-0 sm:px-4 sm:text-[13px] ${
                  activeTab === tab.value
                    ? "bg-white/[0.08] text-white"
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

          <div className="mt-6">
            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a24]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
              </div>
            ) : (
              <>
                {activeTab === "legends" && (
                  <>
                    <LegendMeter
                      currentTotal={currentUser?.totalDonated ?? 0}
                      legends={sortedLegends}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {sortedLegends.map((legend, index) => (
                        <LegendCard
                          animationDelay={cardDelayBase + index * 0.15}
                          currentUserId={currentUser?.uid}
                          key={legend.id}
                          legend={legend}
                        />
                      ))}
                    </div>
                    <DethronedSection legends={sortedLegends} />
                  </>
                )}

                {activeTab === "chronicle" && (
                  <ChronicleTab
                    chronicle={chronicle}
                    crownHistory={crownHistory}
                  />
                )}

                {activeTab === "states" && (
                  <StateWall
                    legends={sortedLegends}
                    onSelectState={setSelectedState}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {selectedState && (
          <StateModal
            legend={selectedStateLegend}
            onClose={() => setSelectedState(null)}
            state={selectedState}
          />
        )}
      </main>
    </PageTransition>
  );
}
