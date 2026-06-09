"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import DonateButton from "@/components/DonateButton";
import PageTransition from "@/components/PageTransition";
import { db } from "@/lib/firebase";
import { getWeeklyLeaderboard } from "@/lib/firestore";
import { openRazorpay } from "@/lib/razorpay";
import { formatAmount } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
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
  rankChange?: number;
  upgrades?: UserUpgrades;
}

interface StateBattleEntry {
  emoji: string;
  name: string;
  total: number;
}

interface LeaderboardUser {
  uid?: string;
  badges?: string[];
  boostActive?: boolean;
  boostExpiry?: unknown;
  currentWeekDonated?: number;
  displayName?: string;
  district?: string;
  email?: string;
  isAnonymous?: boolean;
  lastDonationWeek?: string;
  name?: string;
  state?: string;
  streak?: number;
  totalDonated?: number;
  upgrades?: UserUpgrades;
}

interface CrownMeta {
  currentHolder?: string;
  currentHolderName?: string;
  currentHolderState?: string;
  currentHolderDistrict?: string;
  since?: unknown;
}

type CrownTransferPhase = "old" | "new" | null;

const tabs: Array<{ label: string; value: LeaderboardTab }> = [
  { label: "District", value: "district" },
  { label: "State", value: "state" },
  { label: "National", value: "national" },
];

const flashMessages = [
  "⚡ Parveen from Haryana just donated ₹500!",
  "⚡ Anonymous from UP just donated ₹1,000!",
  "⚡ Tanishq from Bihar just donated ₹2,500!",
  "⚡ Someone from Delhi just donated ₹750!",
  "⚡ A donor from Punjab just donated ₹5,000!",
];

const confettiColors = [
  "#f0c040",
  "#7c6af7",
  "#ef4444",
  "#22c55e",
  "#38bdf8",
  "#f97316",
];

function getTimeUntilReset() {
  const now = new Date();
  const reset = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;

  reset.setDate(now.getDate() + daysUntilMonday);
  reset.setHours(0, 0, 0, 0);

  const totalSeconds = Math.max(
    0,
    Math.floor((reset.getTime() - now.getTime()) / 1000),
  );
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    isUrgent: totalSeconds < 86400,
    label: `${days}d ${hours}h ${minutes}m ${seconds}s`,
  };
}

function getFilterValue(tab: LeaderboardTab, user?: LeaderboardUser | null) {
  if (tab === "district") {
    return user?.district ?? "";
  }

  if (tab === "state") {
    return user?.state ?? "";
  }

  return undefined;
}

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

function getDisplayName(entry: LeaderboardEntry) {
  return entry.isAnonymous
    ? "👻 Anonymous"
    : entry.displayName ?? "WeClout User";
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

function getTimestampMillis(value: unknown) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
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

function getHeatClass(rank: number, isCurrentUser: boolean) {
  const currentClass = isCurrentUser && rank !== 1 ? " leaderboard-current-row" : "";

  if (rank === 1) {
    return "leaderboard-heat-rank-1";
  }

  if (rank === 2) {
    return `leaderboard-heat-rank-2${currentClass}`;
  }

  if (rank === 3) {
    return `leaderboard-heat-rank-3${currentClass}`;
  }

  if (rank >= 4 && rank <= 10) {
    return `leaderboard-heat-rank-top-10${currentClass}`;
  }

  return `leaderboard-heat-normal${currentClass}`;
}

function getCrownDurationLabel(since: unknown, now: number) {
  const sinceMillis = getTimestampMillis(since);

  if (!sinceMillis) {
    return "just now";
  }

  const diff = Math.max(0, now - sinceMillis);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  if (days <= 0 && hours <= 0) {
    return "less than 1 hour";
  }

  return `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`;
}

function addRankChanges(entries: LeaderboardEntry[]) {
  const changes = [2, -1, 0, 3, -2, 1, 0, -1];

  return entries.map((entry, index) => ({
    ...entry,
    rank: entry.rank ?? index + 1,
    rankChange: changes[index % changes.length],
  }));
}

function RankChange({ value = 0 }: { value?: number }) {
  const isUp = value > 0;
  const isDown = value < 0;

  return (
    <span
      className={`min-w-12 text-xs font-bold ${
        isUp ? "text-green-400" : isDown ? "text-red-400" : "text-[#444455]"
      }`}
      style={{ animation: "rankSlideIn 0.35s ease-out both" }}
    >
      {isUp ? `↑ +${value}` : isDown ? `↓ ${value}` : "—"}
    </span>
  );
}

function StateBattleBar({ states }: { states: StateBattleEntry[] }) {
  const highestTotal = Math.max(...states.map((state) => state.total), 1);

  return (
    <section className="card-shine mt-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:mt-8 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
        <h2 className="text-[11px] uppercase tracking-widest text-[#444455]">
          State Battle
        </h2>
      </div>

      <div className="space-y-4">
        {states.map((state, index) => {
          const width = `${Math.max((state.total / highestTotal) * 100, 4)}%`;
          const isLeading = index === 0;

          return (
            <div
              className={`rounded-xl border p-3 sm:p-4 ${
                isLeading
                  ? "border-[#f0c040]/20 bg-[#1a1500]"
                  : "border-white/[0.08] bg-[#16161f]"
              }`}
              key={state.name}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                  <span>{state.emoji}</span>
                  <span>{state.name}</span>
                  {isLeading && (
                    <span className="rounded-full border border-[#f0c040]/20 bg-[#1a1500] px-2 py-0.5 text-[10px] font-medium text-[#f0c040]/80">
                      Leading
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-[#f0c040]">
                  {formatAmount(state.total)}
                </span>
              </div>
              <div className="h-[2px] overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f0c040] to-[#ffe680] transition-all duration-1000"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PodiumSlot({
  entry,
  heightClass,
  rank,
  tone,
}: {
  entry?: LeaderboardEntry;
  heightClass: string;
  rank: number;
  tone: "gold" | "silver" | "bronze";
}) {
  const displayName = entry ? getDisplayName(entry) : "Waiting";
  const firstLetter = displayName.replace("👻 ", "").charAt(0).toUpperCase();
  const toneClasses = {
    bronze: {
      avatar: "bg-[#cd7f32]/25 text-[#cd7f32]",
      block: "from-[#7c3f16] to-[#cd7f32]",
      shadow: "0 0 20px rgba(205,127,50,0.4)",
    },
    gold: {
      avatar: "bg-[#f0c040]/25 text-[#f0c040]",
      block: "from-[#8a6415] to-[#f0c040]",
      shadow: "0 0 40px rgba(240,192,64,0.5)",
    },
    silver: {
      avatar: "bg-[#c0c0c0]/20 text-[#e5e5e5]",
      block: "from-[#737373] to-[#c0c0c0]",
      shadow: "0 0 30px rgba(192,192,192,0.4)",
    },
  }[tone];

  return (
    <div className="relative flex flex-1 flex-col items-center justify-end">
      {rank === 1 && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-80 overflow-hidden">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              className="confetti-piece"
              key={index}
              style={{
                animationDelay: `${index * 0.16}s`,
                animationDuration: `${1.8 + (index % 4) * 0.25}s`,
                background: confettiColors[index % confettiColors.length],
                left: `${8 + index * 7}%`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="relative z-10 mb-4 rounded-3xl border border-white/10 bg-[#11111c]/90 p-4 text-center"
        style={{ boxShadow: toneClasses.shadow }}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black ${toneClasses.avatar}`}
        >
          {rank === 1 ? "👑" : firstLetter}
        </div>
        <p className="mt-3 max-w-32 truncate text-sm font-bold text-white">
          {displayName}
        </p>
        <p className="mt-1 text-sm font-black text-[#f0c040]">
          {formatAmount(entry?.amount ?? 0)}
        </p>
      </div>

      <div
        className={`${heightClass} flex w-full max-w-36 items-center justify-center rounded-t-2xl bg-gradient-to-br ${toneClasses.block} text-3xl font-black text-[#111118] shadow-xl`}
      >
        #{rank}
      </div>
    </div>
  );
}

function TopThreePodium({ entries }: { entries: LeaderboardEntry[] }) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#181827] to-[#10101d] p-5">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-white">National Podium</h2>
        <span className="rounded-full border border-[#f0c040]/40 bg-[#f0c040]/10 px-3 py-1 text-xs font-black text-[#f0c040]">
          Top 3
        </span>
      </div>

      <div className="flex min-h-80 items-end gap-3 md:gap-8">
        <PodiumSlot
          entry={second}
          heightClass="h-16"
          rank={2}
          tone="silver"
        />
        <PodiumSlot entry={first} heightClass="h-24" rank={1} tone="gold" />
        <PodiumSlot
          entry={third}
          heightClass="h-12"
          rank={3}
          tone="bronze"
        />
      </div>
    </section>
  );
}

function LeaderboardRow({
  chased,
  crownTransferPhase,
  currentUserId,
  entry,
  index,
  onBoostClick,
}: {
  chased?: boolean;
  crownTransferPhase?: CrownTransferPhase;
  currentUserId?: string;
  entry: LeaderboardEntry;
  index: number;
  onBoostClick?: () => void;
}) {
  const rank = entry.rank ?? index + 1;
  const displayName = getDisplayName(entry);
  const isCurrentUser = Boolean(currentUserId && entry.userId === currentUserId);
  const boostLive = isBoostLive(entry);
  const animatedBorder = Boolean(entry.upgrades?.animatedBorder);
  const boldName = Boolean(entry.upgrades?.boldName);
  const showCrown = rank === 1 || crownTransferPhase === "old";
  const rowAnimations = [
    `leaderboardRowIn 0.45s ease-out ${index * 50}ms both`,
  ];

  if (rank === 1) {
    rowAnimations.push(`heatPulse 2s ease-in-out ${450 + index * 50}ms infinite`);
  }

  if (crownTransferPhase === "new") {
    rowAnimations.push("crownNewRowFlash 1s ease-out 0.3s both");
  }

  return (
    <div
      className={`leaderboard-row-base ${getHeatClass(rank, isCurrentUser)} ${
        boostLive ? "leaderboard-boost-row" : ""
      } ${chased && rank !== 1 ? "leaderboard-chased-row" : ""} ${
        crownTransferPhase === "new" ? "leaderboard-crown-new-row" : ""
      } flex items-center gap-2 border-b border-white/[0.04] px-2 py-3 transition sm:gap-3 sm:px-4 sm:py-3.5`}
      style={{
        animation: rowAnimations.join(", "),
      }}
    >
      <div className="flex w-12 shrink-0 items-center gap-1 sm:w-14">
        {showCrown && (
          <span
            className={`leaderboard-crown-war ${
              crownTransferPhase === "old"
                ? "leaderboard-crown-transfer-old"
                : crownTransferPhase === "new"
                  ? "leaderboard-crown-transfer-new"
                  : ""
            }`}
            aria-label="Crown holder"
            role="img"
          >
            👑
          </span>
        )}
        <span className={`text-[13px] font-medium ${rank <= 3 ? getRankColor(rank) : "text-[#444455]"}`}>
          {rank}
        </span>
      </div>
      <span className="hidden sm:inline-flex">
        <RankChange value={entry.rankChange} />
      </span>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0c040]/10 bg-cover bg-center text-[12px] font-semibold text-[#f0c040] sm:h-9 sm:w-9 sm:text-[13px] ${
          animatedBorder ? "animated-profile-border" : ""
        }`}
        style={{
          backgroundImage: entry.photoURL ? `url(${entry.photoURL})` : undefined,
        }}
      >
        {!entry.photoURL && displayName.replace("👻 ", "").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate ${
            boostLive
              ? "text-[#f0c040]"
              : "text-[#f0f0f0]"
          } ${boldName ? "text-[14px] font-bold" : "text-[13px] font-medium"}`}
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
        <p className="mt-1 truncate text-[11px] text-[#888899]">
          {[entry.state, entry.district].filter(Boolean).join(" • ")}
        </p>
      </div>
      <p className="shrink-0 text-[12px] font-semibold text-[#f0c040] sm:text-[13px]">
        {formatAmount(entry.amount ?? 0)}
      </p>
      {isCurrentUser && (
        <button
          className="min-h-9 shrink-0 rounded-lg border border-[#f0c040]/25 bg-[#f0c040]/10 px-3 py-1.5 text-[12px] font-semibold text-[#f0c040] transition hover:bg-[#f0c040]/15"
          onClick={onBoostClick}
          type="button"
        >
          ⚡ Boost
        </button>
      )}
    </div>
  );
}

function getPinnedUserEntry(
  entries: LeaderboardEntry[],
  user?: LeaderboardUser | null,
): LeaderboardEntry | null {
  if (!user?.uid) {
    return null;
  }

  const existing = entries.find((entry) => entry.userId === user.uid);

  if (existing) {
    return existing;
  }

  return {
    amount: user.currentWeekDonated ?? 0,
    boostActive: user.boostActive,
    boostExpiry: user.boostExpiry,
    displayName: user.isAnonymous ? "👻 Anonymous" : user.name ?? user.displayName,
    district: user.district ?? "",
    isAnonymous: Boolean(user.isAnonymous),
    rank: entries.length + 1,
    rankChange: 0,
    state: user.state ?? "",
    upgrades: user.upgrades,
    userId: user.uid,
  };
}

export default function LeaderboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const leaderboardUser = user as LeaderboardUser | null;
  const loading = useAuthStore((state) => state.loading);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("district");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetTime, setResetTime] = useState(getTimeUntilReset());
  const [haryanaTotal, setHaryanaTotal] = useState(0);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostPaymentLoading, setBoostPaymentLoading] = useState(false);
  const [crownMeta, setCrownMeta] = useState<CrownMeta | null>(null);
  const [crownNow, setCrownNow] = useState(Date.now());
  const [crownTransfer, setCrownTransfer] = useState<{
    newHolder?: string;
    oldHolder?: string;
    phase: CrownTransferPhase;
  } | null>(null);
  const previousTopRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetTime(getTimeUntilReset());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCrownNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let timeoutId: number;
    let isMounted = true;

    function scheduleFlash() {
      timeoutId = window.setTimeout(
        () => {
          if (!isMounted) {
            return;
          }

          toast(flashMessages[Math.floor(Math.random() * flashMessages.length)], {
            duration: 3000,
            style: {
              background: "#1a1a24",
              border: "1px solid #f0c040",
              color: "#f0c040",
            },
          });
          scheduleFlash();
        },
        Math.random() * 4000 + 8000,
      );
    }

    scheduleFlash();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    async function loadLeaderboard() {
      setIsLoading(true);

      try {
        const filterValue = getFilterValue(activeTab, leaderboardUser);

        if (activeTab !== "national" && !filterValue) {
          setEntries([]);
          return;
        }

        const data = await getWeeklyLeaderboard(activeTab, filterValue);
        setEntries(addRankChanges(data as LeaderboardEntry[]));
      } catch (error) {
        console.log("Leaderboard page fetch error:", error);
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaderboard();
  }, [activeTab, leaderboardUser, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    const timeouts: number[] = [];

    async function syncCrownOwner() {
      const topEntry = entries[0];

      if (!topEntry?.userId || !topEntry.amount) {
        return;
      }

      try {
        const crownRef = doc(db, "leaderboard_meta", "crown");
        const crownSnap = await getDoc(crownRef);
        const existing = crownSnap.exists()
          ? (crownSnap.data() as CrownMeta)
          : null;

        if (!isMounted) {
          return;
        }

        if (existing?.currentHolder === topEntry.userId) {
          setCrownMeta(existing);
          previousTopRef.current = topEntry.userId;
          return;
        }

        const previousHolderId =
          existing?.currentHolder ?? previousTopRef.current ?? undefined;
        const previousHolderName = existing?.currentHolderName ?? "No one";
        const newHolderName = getDisplayName(topEntry);
        const nextCrownMeta: CrownMeta = {
          currentHolder: topEntry.userId,
          currentHolderDistrict: topEntry.district,
          currentHolderName: newHolderName,
          currentHolderState: topEntry.state,
          since: new Date(),
        };

        if (previousHolderId && previousHolderId !== topEntry.userId) {
          setCrownTransfer({
            oldHolder: previousHolderId,
            phase: "old",
          });
          timeouts.push(
            window.setTimeout(() => {
              setCrownTransfer({
                newHolder: topEntry.userId,
                phase: "new",
              });
            }, 800),
          );
          timeouts.push(
            window.setTimeout(() => {
              setCrownTransfer(null);
            }, 1400),
          );
          toast(`👑 ${newHolderName} has taken the crown!`, {
            duration: 3500,
            style: {
              background: "#1a1a24",
              border: "1px solid #f0c040",
              color: "#f0c040",
            },
          });
        }

        await setDoc(
          crownRef,
          {
            currentHolder: topEntry.userId,
            currentHolderDistrict: topEntry.district ?? "",
            currentHolderName: newHolderName,
            currentHolderState: topEntry.state ?? "",
            since: serverTimestamp(),
          },
          { merge: true },
        );

        if (previousHolderId && previousHolderId !== topEntry.userId) {
          await addDoc(collection(db, "crown_history"), {
            newHolder: newHolderName,
            newHolderDistrict: topEntry.district ?? "",
            newHolderState: topEntry.state ?? "",
            previousHolder: previousHolderName,
            transferredAt: serverTimestamp(),
          });
        }

        if (isMounted) {
          setCrownMeta(nextCrownMeta);
          previousTopRef.current = topEntry.userId;
        }
      } catch (error) {
        console.log("Crown sync error:", error);
      }
    }

    syncCrownOwner();

    return () => {
      isMounted = false;
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [entries]);

  useEffect(() => {
    async function loadStateBattle() {
      const haryanaEntries = await getWeeklyLeaderboard("state", "Haryana");
      const total = haryanaEntries.reduce(
        (sum, entry) => sum + Number(entry.amount ?? 0),
        0,
      );

      setHaryanaTotal(total);
    }

    loadStateBattle();
  }, [refreshKey]);

  function handleDonationSuccess() {
    setRefreshKey((currentKey) => currentKey + 1);

    if (leaderboardUser?.uid) {
      refreshUser(leaderboardUser.uid).catch(() => undefined);
    }
  }

  async function handleBoostPayment() {
    if (!leaderboardUser?.uid) {
      toast.error("Please log in first.");
      return;
    }

    const uid = leaderboardUser.uid;
    setBoostPaymentLoading(true);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({
          amount: 49,
          currency: "INR",
          receipt: `weclout_boost_${Date.now()}`,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to create Boost order.");
      }

      const order = (await orderResponse.json()) as {
        id?: string;
        orderId?: string;
      };
      const orderId = order.orderId ?? order.id;

      if (!orderId) {
        throw new Error("Boost order id missing.");
      }

      await openRazorpay({
        amount: 49,
        description: "Leaderboard Boost - 24 hours",
        name: "WeClout",
        onDismiss: () => setBoostPaymentLoading(false),
        onSuccess: async (_paymentId, response) => {
          const verifyResponse = await fetch("/api/verify-payment", {
            body: JSON.stringify({
              amount: 49,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: uid,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
          const verification = (await verifyResponse.json()) as {
            verified?: boolean;
          };

          if (!verification.verified) {
            throw new Error("Payment verification failed.");
          }

          const boostExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await updateDoc(doc(db, "users", uid), {
            boostActive: true,
            boostExpiry,
          });
          await refreshUser(uid);
          setBoostModalOpen(false);
          setBoostPaymentLoading(false);
          setRefreshKey((currentKey) => currentKey + 1);
          toast.success("⚡ You're Boosted for 24 hours!");
        },
        orderId,
        prefill: {
          email: leaderboardUser.email ?? "",
          name: leaderboardUser.name ?? leaderboardUser.displayName ?? "WeClouter",
        },
      });
    } catch (error) {
      setBoostPaymentLoading(false);
      toast.error(error instanceof Error ? error.message : "Boost payment failed.");
    }
  }

  const donationUser = leaderboardUser?.uid
    ? {
        badges: leaderboardUser.badges ?? [],
        currentWeekDonated: leaderboardUser.currentWeekDonated ?? 0,
        district: leaderboardUser.district ?? "",
        email: leaderboardUser.email ?? undefined,
        isAnonymous: Boolean(leaderboardUser.isAnonymous),
        lastDonationWeek: leaderboardUser.lastDonationWeek,
        name: leaderboardUser.name ?? leaderboardUser.displayName ?? "WeClouter",
        state: leaderboardUser.state ?? "",
        streak: leaderboardUser.streak ?? 0,
        totalDonated: leaderboardUser.totalDonated ?? 0,
        uid: leaderboardUser.uid,
      }
    : null;
  const pinnedEntry = getPinnedUserEntry(entries, leaderboardUser);
  const visibleEntries = entries.filter(
    (entry) => entry.userId !== leaderboardUser?.uid,
  );
  const currentRank = pinnedEntry?.rank ?? 0;
  const rankAbove = currentRank > 1 ? currentRank - 1 : 1;
  const entryAbove = entries.find((entry) => entry.rank === rankAbove);
  const gapToNext = Math.max(
    0,
    Number(entryAbove?.amount ?? 0) - Number(pinnedEntry?.amount ?? 0) + 1,
  );
  const chaser = useMemo(() => {
    if (!pinnedEntry || !pinnedEntry.amount || pinnedEntry.amount <= 0) {
      return null;
    }

    const behind = entries
      .filter((entry) => entry.userId !== pinnedEntry.userId)
      .filter((entry) => Number(entry.amount ?? 0) < Number(pinnedEntry.amount))
      .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0))[0];

    if (!behind) {
      return null;
    }

    const gap = Number(pinnedEntry.amount ?? 0) - Number(behind.amount ?? 0);

    return gap <= Number(pinnedEntry.amount) * 0.2
      ? { entry: behind, gap }
      : null;
  }, [entries, pinnedEntry]);
  const stateBattleEntries = useMemo(
    () =>
      [
        { emoji: "🇮🇳", name: "Haryana", total: haryanaTotal },
        { emoji: "🇮🇳", name: "UP", total: 72000 },
        { emoji: "🇮🇳", name: "Delhi", total: 65000 },
      ].sort((a, b) => b.total - a.total),
    [haryanaTotal],
  );
  const crownHolderName = crownMeta?.currentHolderName ?? getDisplayName(entries[0] ?? {});
  const crownStatus = crownMeta?.currentHolder === leaderboardUser?.uid
    ? "👑 You are holding the crown! Keep donating."
    : `👑 Crown held by ${crownHolderName}${
        crownMeta?.currentHolderState ? ` from ${crownMeta.currentHolderState}` : ""
      } for ${getCrownDurationLabel(crownMeta?.since, crownNow)}`;

  function getCrownTransferPhase(entry: LeaderboardEntry): CrownTransferPhase {
    if (!entry.userId || !crownTransfer) {
      return null;
    }

    if (crownTransfer.phase === "old" && crownTransfer.oldHolder === entry.userId) {
      return "old";
    }

    if (crownTransfer.phase === "new" && crownTransfer.newHolder === entry.userId) {
      return "new";
    }

    return null;
  }

  return (
    <PageTransition>
      <main className="min-h-screen overflow-hidden bg-[var(--bg)] px-4 sm:px-6 pb-20 pt-14 text-white md:px-8 md:pb-10">
        <div className="page-enter relative mx-auto max-w-7xl py-10">
          <div className="hero-glow" />
          <header className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[11px] font-medium text-red-400">LIVE</span>
              </span>
              <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-[#f0f0f0] sm:text-[28px]">
                Leaderboard
              </h1>
              <p className="mt-3 max-w-2xl text-[13px] text-[#888899]">
                District pride, state heat, and national clout in one electric
                race.
              </p>
            </div>

            <div
              className={`w-full rounded-xl border border-white/[0.08] bg-[#1a1a24] px-4 py-2 text-left sm:w-auto sm:text-right ${
                resetTime.isUrgent
                  ? "text-red-300"
                  : "text-[#f0c040]"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#444455]">
                Weekly reset
              </p>
              <p className="mt-1 text-[14px] font-semibold text-[#f0c040]">
                Resets in {resetTime.label}
              </p>
            </div>
          </header>

          <StateBattleBar states={stateBattleEntries} />

          <section className="relative z-10 mt-6 rounded-xl border border-white/[0.08] bg-[#1a1a24] p-1 sm:mt-8">
            <div className="grid grid-cols-3">
              {tabs.map((tab) => (
                <button
                  className={`min-h-11 rounded-lg px-2 py-2 text-[12px] font-medium transition sm:min-h-0 sm:px-4 sm:text-[13px] ${
                    activeTab === tab.value
                      ? "bg-white/[0.08] text-white"
                      : "text-[#888899] hover:text-[#f0f0f0]"
                  }`}
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {activeTab === "national" && entries.length > 0 && (
            <TopThreePodium entries={entries} />
          )}

          <section className="card-shine relative z-10 mt-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-3 sm:mt-8 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[11px] uppercase tracking-widest text-[#444455]">
                  {activeTab === "district"
                    ? "District Rankings"
                    : activeTab === "state"
                      ? "State Rankings"
                      : "National Rankings"}
                </h2>
                <p className="mt-1 text-[12px] text-[#888899]">
                  Top 50 donors this week
                </p>
              </div>
              <span className="rounded-full bg-[#f0c040]/10 px-3 py-1 text-xs font-medium text-[#f0c040]">
                {entries.length} active racers
              </span>
            </div>

            {entries.length > 0 && (
              <div className="mb-4 rounded-xl border border-[#f0c040]/15 bg-[#f0c040]/[0.06] px-4 py-3 text-center text-[12px] font-medium text-[#f0c040]/85">
                {crownStatus}
              </div>
            )}

            {isLoading ? (
              <div className="flex min-h-72 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex min-h-72 items-center justify-center rounded-xl border border-white/[0.08] bg-[#16161f] text-center text-sm text-[#888899]">
                No donations yet this week. Be the first!
              </div>
            ) : (
              <>
                <div>
                  {visibleEntries.slice(0, 50).map((entry, index) => (
                    <LeaderboardRow
                      crownTransferPhase={getCrownTransferPhase(entry)}
                      currentUserId={leaderboardUser?.uid}
                      entry={entry}
                      index={index}
                      key={`${entry.userId ?? getDisplayName(entry)}-${entry.rank}`}
                    />
                  ))}
                </div>

                {pinnedEntry && (
                  <div className="mt-8">
                    <div className="mb-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#444455]">
                      — Your Position —
                    </div>

                    {chaser && (
                      <div className="mb-3 animate-pulse rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-sm font-bold text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.18)]">
                        ⚠️ {getDisplayName(chaser.entry)} is{" "}
                        {formatAmount(chaser.gap)} behind you! Donate to stay
                        ahead!
                      </div>
                    )}

                    <LeaderboardRow
                      chased={Boolean(chaser)}
                      crownTransferPhase={getCrownTransferPhase(pinnedEntry)}
                      currentUserId={leaderboardUser?.uid}
                      entry={pinnedEntry}
                      index={0}
                      onBoostClick={() => setBoostModalOpen(true)}
                    />
                    <p className="mt-3 rounded-2xl border border-[#f0c040]/30 bg-[#f0c040]/10 p-3 text-center text-sm font-bold text-[#f0c040]">
                      {currentRank <= 1
                        ? "You are holding #1. Keep the crown warm."
                        : `${formatAmount(gapToNext)} more to reach #${rankAbove}`}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          <div className="mt-8 flex justify-center">
            <DonateButton
              buttonLabel="Boost Your Rank"
              onDonationSuccess={handleDonationSuccess}
              user={donationUser}
              variant="inline"
            />
          </div>
        </div>

        {boostModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Boost Your Rank
                  </h2>
                  <p className="mt-2 text-sm text-[#888899]">
                    Your name appears highlighted & bold for everyone on the
                    leaderboard for 24 hours
                  </p>
                </div>
                <button
                  aria-label="Close Boost modal"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[#888899] transition hover:text-white"
                  onClick={() => setBoostModalOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="rounded-2xl border border-[#f0c040]/25 bg-[#f0c040]/10 p-5 text-center">
                <p className="text-[11px] uppercase tracking-widest text-[#f0c040]/70">
                  Boost Price
                </p>
                <p className="mt-2 text-4xl font-black text-[#f0c040]">₹49</p>
              </div>
              <button
                className="mt-5 min-h-11 w-full rounded-xl bg-[#f0c040] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={boostPaymentLoading}
                onClick={handleBoostPayment}
                type="button"
              >
                {boostPaymentLoading ? "Opening Payment..." : "Pay ₹49 & Boost"}
              </button>
              <p className="mt-3 text-center text-xs text-[#888899]">
                Boost expires in 24 hours automatically
              </p>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
