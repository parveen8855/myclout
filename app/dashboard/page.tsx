"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import DonateButton from "@/components/DonateButton";
import PageTransition from "@/components/PageTransition";
import RivalsSection from "@/components/RivalsSection";
import { getUserStage } from "@/lib/badges";
import { getUserDoc, getWeeklyLeaderboard } from "@/lib/firestore";
import { formatAmount } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface UserProfile {
  name?: string;
  email?: string;
  photoURL?: string;
  state?: string;
  district?: string;
  totalDonated?: number;
  currentWeekDonated?: number;
  streak?: number;
  isAnonymous?: boolean;
  badges?: string[];
  bestRank?: number;
  lastDonationWeek?: string;
  rivals?: string[];
}

interface LeaderboardPreviewEntry {
  userId?: string;
  displayName?: string;
  amount?: number;
  state?: string;
  district?: string;
  isAnonymous?: boolean;
  rank?: number;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning,";
  }

  if (hour < 17) {
    return "Good afternoon,";
  }

  return "Good evening,";
}

function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1f1f2e]">
      <p className="mb-2 text-[11px] uppercase tracking-widest text-[#444455]">
        {label}
      </p>
      <p className="text-[22px] font-semibold tracking-tight text-[#f0f0f0]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#888899]">{meta}</p>
    </div>
  );
}

function LeaderboardPreview({
  currentUserId,
  entries,
  isLoading,
}: {
  currentUserId?: string;
  entries: LeaderboardPreviewEntry[];
  isLoading: boolean;
}) {
  return (
    <div className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1f1f2e]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#444455]">
            This Week
          </p>
        </div>
        <Link
          className="text-[11px] font-medium text-[#f0c040]/70 transition-colors hover:text-[#f0c040]"
          href="/leaderboard"
        >
          View Full Leaderboard →
        </Link>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border border-white/10 border-t-[#f0c040]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center text-center text-[13px] text-[#888899]">
            No donations yet this week. Be the first!
          </div>
        ) : (
          <div>
            {entries.slice(0, 3).map((entry, index) => {
              const rank = entry.rank ?? index + 1;
              const displayName = entry.isAnonymous
                ? "👻 Anonymous"
                : entry.displayName ?? "WeClout User";
              const isCurrentUser = Boolean(
                currentUserId && entry.userId === currentUserId,
              );

              return (
                <div
                  className={`flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-b-0 ${
                    isCurrentUser ? "border-l-2 border-l-[#7c6af7] bg-[rgba(124,106,247,0.08)] pl-2" : ""
                  }`}
                  key={`${entry.userId ?? displayName}-${rank}`}
                >
                  <div
                    className="w-6 shrink-0 text-[13px] font-medium text-[#444455]"
                  >
                    {rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#f0f0f0]">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#888899]">
                      {[entry.state, entry.district].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-medium text-[#f0c040]">
                    {formatAmount(entry.amount ?? 0)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [leaderboardPreview, setLeaderboardPreview] = useState<
    LeaderboardPreviewEntry[]
  >([]);
  const [isLeaderboardPreviewLoading, setIsLeaderboardPreviewLoading] =
    useState(true);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);
  const [stateRankPercent, setStateRankPercent] = useState(100);
  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) {
        setProfileLoading(false);
        return;
      }

      try {
        const userDoc = await getUserDoc(user.uid);
        setProfile((userDoc as UserProfile | null) ?? null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load profile.",
        );
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [user?.uid]);

  useEffect(() => {
    async function loadStateRankPercent() {
      if (!user?.uid || !profile?.state) {
        setStateRankPercent(100);
        return;
      }

      try {
        const stateLeaderboard = await getWeeklyLeaderboard(
          "state",
          profile.state,
        );
        const rankIndex = stateLeaderboard.findIndex(
          (entry) => entry.userId === user.uid,
        );

        if (rankIndex === -1 || stateLeaderboard.length === 0) {
          setStateRankPercent(100);
          return;
        }

        setStateRankPercent(((rankIndex + 1) / stateLeaderboard.length) * 100);
      } catch {
        setStateRankPercent(100);
      }
    }

    loadStateRankPercent();
  }, [leaderboardRefreshKey, profile?.state, user?.uid]);

  useEffect(() => {
    async function loadLeaderboardPreview() {
      setIsLeaderboardPreviewLoading(true);

      try {
        const filterType = profile?.district
          ? "district"
          : profile?.state
            ? "state"
            : "national";
        const filterValue =
          filterType === "district"
            ? profile?.district
            : filterType === "state"
              ? profile?.state
              : undefined;
        const entries = await getWeeklyLeaderboard(filterType, filterValue);

        setLeaderboardPreview(entries as LeaderboardPreviewEntry[]);
      } catch {
        setLeaderboardPreview([]);
      } finally {
        setIsLeaderboardPreviewLoading(false);
      }
    }

    loadLeaderboardPreview();
  }, [leaderboardRefreshKey, profile?.district, profile?.state]);

  const displayName = user?.name ?? profile?.name ?? "WeClouter";
  const state = profile?.state ?? "";
  const district = profile?.district ?? "";
  const currentWeekDonated = profile?.currentWeekDonated ?? 0;
  const stage = getUserStage(stateRankPercent);
  const needsProfile = !profileLoading && (!state || !district);
  const donationUser = user?.uid
    ? {
        badges: profile?.badges ?? [],
        currentWeekDonated,
        district,
        email: profile?.email ?? user?.email ?? undefined,
        isAnonymous: Boolean(profile?.isAnonymous),
        lastDonationWeek: profile?.lastDonationWeek,
        name: displayName,
        state,
        streak: profile?.streak ?? 0,
        totalDonated: profile?.totalDonated ?? 0,
        uid: user.uid,
      }
    : null;

  function handleDonationSuccess(amount: number) {
    setProfile((currentProfile) => ({
      ...(currentProfile ?? {}),
      currentWeekDonated: (currentProfile?.currentWeekDonated ?? 0) + amount,
      totalDonated: (currentProfile?.totalDonated ?? 0) + amount,
    }));
    setLeaderboardRefreshKey((currentKey) => currentKey + 1);

    if (user?.uid) {
      getUserDoc(user.uid)
        .then((userDoc) => setProfile((userDoc as UserProfile | null) ?? null))
        .catch(() => undefined);
    }
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] pb-20 pt-14 text-white md:pb-8">
      <div className="page-enter relative mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="hero-glow" />
        {needsProfile && (
          <div className="relative z-10 mb-6 flex flex-col gap-3 rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-4 text-[13px] text-[#888899] sm:flex-row sm:items-center sm:justify-between">
            <p>Complete your profile to appear on leaderboard</p>
            <Link
              className="font-medium text-[#f0c040] transition-colors hover:text-[#ffe680]"
              href="/onboarding"
            >
              Go to onboarding
            </Link>
          </div>
        )}

        <section className="relative z-10 flex flex-col gap-5 pb-8 pt-8 sm:pt-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-widest text-[#444455]">
              {greeting}
            </p>
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-[#f0f0f0] md:text-[26px]">
              {displayName}
            </h1>
            <p className="mt-1 text-[13px] text-[#888899]">
              {[district, state].filter(Boolean).join(", ") || "Location not set"}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#f0c040]/15 bg-[#1a1500] px-2.5 py-1">
              <span className="text-[11px]">{stage.emoji}</span>
              <span className="text-[11px] font-medium text-[#f0c040]/80">
                {stage.name}
              </span>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 text-left md:w-auto md:border-0 md:bg-transparent md:p-0 md:text-right">
            <p className="mb-1 text-[11px] uppercase tracking-widest text-[#444455]">
              This Week
            </p>
            <p className="text-[24px] font-semibold leading-none tracking-tight text-[#f0c040]">
              {formatAmount(currentWeekDonated)}
            </p>
            <p className="mt-1 text-[11px] text-[#444455]">donated</p>
          </div>
        </section>

        <section className="relative z-10 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Donated"
            meta="All time"
            value={formatAmount(profile?.totalDonated ?? 0)}
          />
          <StatCard
            label="Streak"
            meta="Weeks consecutive"
            value={`${profile?.streak ?? 0}`}
          />
          <StatCard
            label="Best Rank"
            meta={state ? `In ${state}` : "Personal best"}
            value={`#${profile?.bestRank ?? "—"}`}
          />
        </section>

        <section className="relative z-10 mt-8 grid gap-4 lg:grid-cols-3">
          <div className="order-2 lg:order-1">
            <RivalsSection maxRivals={3} user={profile} />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-2">
            <LeaderboardPreview
              currentUserId={user?.uid}
              entries={leaderboardPreview}
              isLoading={isLeaderboardPreviewLoading}
            />
          </div>
        </section>

        <section className="relative z-10 mt-8">
          <h2 className="mb-4 text-[11px] uppercase tracking-widest text-[#444455]">
            Explore
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link
              className="card-shine flex h-44 flex-col justify-between rounded-[14px] border border-l-[2px] border-white/[0.08] border-l-red-500/50 bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#1f1f2e]"
              href="/war-room"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[11px] uppercase tracking-wider text-[#444455]">
                  War Room
                </span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-[#f0f0f0]">
                  Fight for Your State
                </h3>
                <p className="mt-1 text-[12px] text-[#888899]">
                  Active campaign running.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#f0c040]/70">
                  ₹6.87L raised
                </span>
                <span className="text-[12px] text-[#888899] transition hover:text-white">
                  Join the Battle →
                </span>
              </div>
            </Link>

            <Link
              className="card-shine flex h-44 flex-col justify-between rounded-[14px] border border-l-[2px] border-white/[0.08] border-l-purple-500/50 bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#1f1f2e]"
              href="/made-my-day"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span className="text-[11px] uppercase tracking-wider text-[#444455]">
                  Made My Day
                </span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-[#f0f0f0]">
                  Made My Day
                </h3>
                <p className="mt-1 text-[12px] text-[#888899]">
                  Real moments. Real magic.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#f0c040]/70">
                  2,847 moments
                </span>
                <span className="text-[12px] text-[#888899] transition hover:text-white">
                  Explore →
                </span>
              </div>
            </Link>

            <Link
              className="card-shine flex h-44 flex-col justify-between rounded-[14px] border border-l-[2px] border-white/[0.08] border-l-emerald-500/50 bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#1f1f2e]"
              href="/clout-for-good"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] uppercase tracking-wider text-[#444455]">
                  Clout For Good
                </span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-[#f0f0f0]">
                  Clout For Good
                </h3>
                <p className="mt-1 text-[12px] text-[#888899]">
                  Your money. Real lives.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#f0c040]/70">
                  2,847 lives
                </span>
                <span className="text-[12px] text-[#888899] transition hover:text-white">
                  Explore →
                </span>
              </div>
            </Link>

            <Link
              className="card-shine flex h-44 flex-col justify-between rounded-[14px] border border-l-[2px] border-white/[0.08] border-l-[#f0c040]/50 bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#1f1f2e]"
              href="/requests"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f0c040]" />
                <span className="text-[11px] uppercase tracking-wider text-[#444455]">
                  Make it Happen
                </span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-[#f0f0f0]">
                  Make it Happen
                </h3>
                <p className="mt-1 text-[12px] text-[#888899]">
                  Pay. We handle it.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#f0c040]/70">
                  48hr review
                </span>
                <span className="text-[12px] text-[#888899] transition hover:text-white">
                  Explore →
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      <DonateButton
        onDonationSuccess={handleDonationSuccess}
        user={donationUser}
      />
      </main>
    </PageTransition>
  );
}
