"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import CampaignDonateModal from "@/components/CampaignDonateModal";
import PageTransition from "@/components/PageTransition";
import PostChallengeModal from "@/components/PostChallengeModal";
import { useAuthStore } from "@/store/useAuthStore";

type WarRoomTab = "battle" | "milestones" | "challenges" | "history";

type CampaignChallenge = {
  id: string;
  displayName: string;
  state: string;
  pledgeAmount: number;
  triggerAmount: number;
  triggerState: string;
  message: string;
  accepted: boolean;
  fulfilled: boolean;
  createdAt: string;
};

type ActiveCampaign = {
  id: string;
  title: string;
  description: string;
  theme: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  targetAmount: number;
  totalRaised: number;
  daysLeft: number;
  heroAmount?: number;
  heroName?: string;
  stateBreakdown: Record<string, number>;
  districtBreakdown: Record<string, number>;
  milestones: Array<{
    id: string;
    amount: number;
    title: string;
    description: string;
    unlocked: boolean;
    emoji: string;
  }>;
  challenges: CampaignChallenge[];
  recentDonations: Array<{
    displayName: string;
    state: string;
    district: string;
    amount: number;
    time: string;
  }>;
};

const activeCampaign: ActiveCampaign = {
  id: "campaign_001",
  title: "Winter Shield 2026 ❄️",
  description:
    "Thousands of homeless people across India face brutal winters with no shelter or warm clothes. This month, states compete to provide maximum relief. Every rupee stays in your state — Haryana's money goes to Haryana's homeless.",
  theme: "Winter Relief",
  type: "monthly",
  status: "active",
  startDate: "Dec 1, 2026",
  endDate: "Dec 31, 2026",
  targetAmount: 1000000,
  totalRaised: 687500,
  daysLeft: 24,
  heroAmount: 75400,
  heroName: "Parveen Siwach",
  stateBreakdown: {
    Haryana: 285000,
    Punjab: 198000,
    Delhi: 142000,
    UP: 62500,
  },
  districtBreakdown: {
    Rewari: 185000,
    Gurgaon: 72000,
    Faridabad: 28000,
  },
  milestones: [
    {
      id: "m1",
      amount: 100000,
      title: "First Responders",
      description: "WeClout team visits top state, posts photos",
      unlocked: true,
      emoji: "📸",
    },
    {
      id: "m2",
      amount: 300000,
      title: "Ground Zero",
      description: "Live stream from the relief location",
      unlocked: true,
      emoji: "🎥",
    },
    {
      id: "m3",
      amount: 500000,
      title: "State Champion",
      description: "Winner state featured on app for full month",
      unlocked: true,
      emoji: "🏆",
    },
    {
      id: "m4",
      amount: 750000,
      title: "Legend Territory",
      description: "Top 3 donors get permanent Hall of Fame entry",
      unlocked: false,
      emoji: "👑",
    },
    {
      id: "m5",
      amount: 1000000,
      title: "ONE CRORE",
      description: "State name permanently on WeClout homepage forever",
      unlocked: false,
      emoji: "🌟",
    },
  ],
  challenges: [
    {
      id: "ch1",
      displayName: "Parveen Siwach",
      state: "Haryana",
      pledgeAmount: 25000,
      triggerAmount: 300000,
      triggerState: "Haryana",
      message:
        "Agar Haryana 3 lakh cross kare toh main 25,000 aur dunga! Come on Haryana! 💪",
      accepted: true,
      fulfilled: false,
      createdAt: "2 days ago",
    },
    {
      id: "ch2",
      displayName: "Anonymous",
      state: "Punjab",
      pledgeAmount: 15000,
      triggerAmount: 200000,
      triggerState: "Punjab",
      message: "Punjab hits 2L = I add 15K more. Punjab de puttar, aao! 🦁",
      accepted: true,
      fulfilled: false,
      createdAt: "5 days ago",
    },
  ],
  recentDonations: [
    {
      displayName: "Parveen Siwach",
      state: "Haryana",
      district: "Rewari",
      amount: 5000,
      time: "2 min ago",
    },
    {
      displayName: "Anonymous",
      state: "Punjab",
      district: "Ludhiana",
      amount: 2000,
      time: "8 min ago",
    },
    {
      displayName: "Tanishq Nyati",
      state: "Bihar",
      district: "lol",
      amount: 1000,
      time: "15 min ago",
    },
    {
      displayName: "Rahul Sharma",
      state: "Delhi",
      district: "South Delhi",
      amount: 3500,
      time: "23 min ago",
    },
    {
      displayName: "Priya K",
      state: "UP",
      district: "Lucknow",
      amount: 500,
      time: "31 min ago",
    },
  ],
};

const upcomingCampaign = {
  id: "campaign_002",
  title: "School of Champions 📚",
  theme: "Education",
  status: "upcoming",
  startDate: "Jan 1, 2027",
  description:
    "Next month — states compete to fund rural schools. Books, furniture, teachers. Your state's money rebuilds your state's schools.",
  targetAmount: 2000000,
};

const completedCampaign = {
  id: "campaign_000",
  title: "Flood Heroes 2025 🌊",
  theme: "Disaster Relief",
  status: "completed",
  totalRaised: 1250000,
  winnerState: "Assam",
  winnerAmount: 425000,
  livesImpacted: 847,
  heroName: "Biren Das",
  heroAmount: 75000,
  impactProof: [
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400",
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400",
  ],
};

const tabs: Array<{ label: string; value: WarRoomTab }> = [
  { label: "⚔️ State Battle", value: "battle" },
  { label: "🎯 Milestones", value: "milestones" },
  { label: "💪 Challenges", value: "challenges" },
  { label: "📜 History", value: "history" },
];

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getInitial(name: string) {
  return name.replace("Anonymous", "A").charAt(0).toUpperCase();
}

export default function WarRoomPage() {
  const user = useAuthStore((store) => store.user);
  const [activeTab, setActiveTab] = useState<WarRoomTab>("battle");
  const [campaignState, setCampaignState] = useState(activeCampaign);
  const [liveFeedIndex, setLiveFeedIndex] = useState(0);
  const [selectedState, setSelectedState] = useState(user?.state || "Haryana");
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const campaignProgress =
    (campaignState.totalRaised / campaignState.targetAmount) * 100;
  const userState = user?.state || selectedState || "Haryana";
  const userDistrict = user?.district || "Rewari";
  const currentFeed = campaignState.recentDonations[liveFeedIndex];

  useEffect(() => {
    setSelectedState(user?.state || "Haryana");
  }, [user?.state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLiveFeedIndex(
        (current) => (current + 1) % campaignState.recentDonations.length,
      );
    }, 5000);

    return () => window.clearInterval(interval);
  }, [campaignState.recentDonations.length]);

  const sortedStates = useMemo(
    () =>
      Object.entries(campaignState.stateBreakdown).sort(
        (first, second) => second[1] - first[1],
      ),
    [campaignState.stateBreakdown],
  );
  const sortedDistricts = useMemo(
    () =>
      Object.entries(campaignState.districtBreakdown).sort(
        (first, second) => second[1] - first[1],
      ),
    [campaignState.districtBreakdown],
  );
  const maxStateAmount = Math.max(...Object.values(campaignState.stateBreakdown));
  const maxDistrictAmount = Math.max(
    ...Object.values(campaignState.districtBreakdown),
  );

  function handleDonationSuccess(amount: number, state: string, district: string) {
    setCampaignState((current) => {
      const displayName = user?.isAnonymous
        ? "Anonymous"
        : user?.name ?? user?.displayName ?? "WeClout Warrior";

      return {
        ...current,
        districtBreakdown: {
          ...current.districtBreakdown,
          [district]: (current.districtBreakdown[district] ?? 0) + amount,
        },
        heroAmount:
          amount > (current.heroAmount ?? 0) ? amount : current.heroAmount,
        heroName:
          amount > (current.heroAmount ?? 0) ? displayName : current.heroName,
        recentDonations: [
          {
            amount,
            displayName,
            district,
            state,
            time: "Just now",
          },
          ...current.recentDonations,
        ],
        stateBreakdown: {
          ...current.stateBreakdown,
          [state]: (current.stateBreakdown[state] ?? 0) + amount,
        },
        totalRaised: current.totalRaised + amount,
      };
    });
    setLiveFeedIndex(0);
  }

  function handleChallengePosted(challenge: CampaignChallenge) {
    setCampaignState((current) => ({
      ...current,
      challenges: [challenge, ...current.challenges],
    }));
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 sm:px-6 pb-20 pt-14 text-white md:pb-8">
        {/* Firestore indexes needed:
          campaign_donations: state Ascending + createdAt Descending
          campaign_donations: campaignId Ascending + amount Descending
          challenges: campaignId Ascending + createdAt Descending
        */}
        <div className="page-enter relative mx-auto max-w-6xl">
          <section className="relative overflow-hidden pb-0 pt-10">
            <div className="hero-glow" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-red-400">
                  War Room — Active Campaign
                </span>
              </div>

              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <h1 className="mb-2 text-[26px] font-semibold tracking-tight text-[#f0f0f0] sm:text-[32px]">
                    {campaignState.title}
                  </h1>
                  <p className="max-w-xl text-[13px] leading-relaxed text-[#888899] sm:text-[14px]">
                    {campaignState.description}
                  </p>
                </div>

                <div className="w-full rounded-2xl border border-red-500/20 bg-[#1a1a24] px-5 py-4 text-center sm:w-auto">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-red-400">
                    Campaign Ends In
                  </p>
                  <p className="text-[24px] font-bold tracking-tight text-[#f0f0f0] sm:text-[28px]">
                    {campaignState.daysLeft}d 12h 45m
                  </p>
                  <p className="mt-1 text-[10px] text-[#444455]">
                    Dec 31, 2026 midnight
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-widest text-[#444455]">
                  Total Raised Nationwide
                </p>
                <p
                  className="text-[30px] font-bold tracking-tight sm:text-[36px]"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    background: "linear-gradient(135deg, #f0c040, #ffe680)",
                  }}
                >
                  {formatAmount(campaignState.totalRaised)}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[11px] text-[#444455]">Target</p>
                <p className="text-[16px] font-semibold text-[#f0f0f0]">
                  ₹{(campaignState.targetAmount / 100000).toFixed(0)}L
                </p>
              </div>
            </div>

            <div className="relative mb-2 h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                style={{
                  background: "linear-gradient(90deg, #c8960c, #f0c040, #ffe680)",
                  boxShadow: "0 0 12px rgba(240,192,64,0.4)",
                  width: `${campaignProgress}%`,
                }}
              />
              {campaignState.milestones.map((milestone) => (
                <div
                  className="absolute bottom-0 top-0 w-px"
                  key={milestone.id}
                  style={{
                    background: milestone.unlocked
                      ? "rgba(240,192,64,0.8)"
                      : "rgba(255,255,255,0.2)",
                    left: `${(milestone.amount / campaignState.targetAmount) * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <p className="text-[11px] text-[#f0c040]">
                {campaignProgress.toFixed(1)}% funded
              </p>
              <p className="text-[11px] text-[#444455]">
                {formatAmount(
                  campaignState.targetAmount - campaignState.totalRaised,
                )}{" "}
                remaining
              </p>
            </div>

            <button
              className="mt-4 min-h-11 w-full rounded-xl py-3 text-[14px] font-semibold text-black transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              onClick={() => setShowDonateModal(true)}
              style={{
                background: "linear-gradient(135deg, #f0c040, #ffe680)",
              }}
              type="button"
            >
              ⚔️ Fight for {userState} — Donate Now
            </button>
          </section>

          <div className="relative mt-4 overflow-hidden border-y border-white/[0.04] bg-[#0f0f0f] py-2.5">
            <div className="flex items-center gap-2 px-4">
              <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-red-500" />
              <p
                className="text-[12px] text-[#f0f0f0] transition-all duration-500"
                key={`${currentFeed.displayName}-${liveFeedIndex}`}
              >
                ⚡ {currentFeed.displayName} from {currentFeed.state} just
                donated {formatAmount(currentFeed.amount)} for their state!
              </p>
            </div>
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-[#1a1a24] p-1 sm:inline-flex sm:w-auto sm:flex-wrap">
            {tabs.map((tab) => (
              <button
                className={`min-h-11 rounded-lg px-3 py-2 text-[12px] font-medium transition sm:min-h-0 sm:px-4 sm:text-[13px] ${
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

          {activeTab === "battle" && (
            <>
              <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                      State Rankings
                    </p>
                    <p className="text-[11px] text-[#888899]">
                      Money stays in your state
                    </p>
                  </div>

                  {sortedStates.map(([state, amount], index) => {
                    const isUserState = state === userState;
                    const percent = (amount / maxStateAmount) * 100;

                    return (
                      <div className="mb-4 last:mb-0" key={state}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-4 text-[11px] text-[#444455]">
                              #{index + 1}
                            </span>
                            <span
                              className={`truncate text-[13px] font-medium ${
                                isUserState ? "text-[#f0c040]" : "text-[#f0f0f0]"
                              }`}
                            >
                              {state}
                              {isUserState && " (You)"}
                            </span>
                            {index === 0 && (
                              <span className="rounded-full border border-[#f0c040]/20 bg-[#1a1500] px-1.5 py-0.5 text-[10px] text-[#f0c040]">
                                👑 Leading
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] font-semibold text-[#f0c040]">
                            {formatAmount(amount)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              background: isUserState
                                ? "linear-gradient(90deg, #c8960c, #f0c040)"
                                : "linear-gradient(90deg, #444455, #666677)",
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                      {userState} — District Duel
                    </p>
                    <p className="text-[11px] text-[#888899]">
                      Your district vs others
                    </p>
                  </div>

                  {sortedDistricts.map(([district, amount], index) => {
                    const isUserDistrict = district === userDistrict;
                    const percent = (amount / maxDistrictAmount) * 100;

                    return (
                      <div className="mb-4 last:mb-0" key={district}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-4 text-[11px] text-[#444455]">
                              #{index + 1}
                            </span>
                            <span
                              className={`truncate text-[13px] font-medium ${
                                isUserDistrict
                                  ? "text-[#f0c040]"
                                  : "text-[#f0f0f0]"
                              }`}
                            >
                              {district}
                              {isUserDistrict && " (You)"}
                            </span>
                          </div>
                          <span className="text-[13px] font-semibold text-[#f0c040]">
                            {formatAmount(amount)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              background: isUserDistrict
                                ? "linear-gradient(90deg, #7c6af7, #a78bfa)"
                                : "linear-gradient(90deg, #333344, #444455)",
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <div className="flex justify-between gap-4">
                      <p className="text-[11px] text-[#444455]">
                        Your contribution this campaign
                      </p>
                      <p className="text-[12px] font-semibold text-[#f0c040]">
                        {formatAmount(user?.currentWeekDonated ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[#f0c040]/15 bg-[#1a1500] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f0c040]/20 bg-[#f0c040]/10 text-[16px] font-bold text-[#f0c040]">
                    P
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#f0f0f0]">
                        {campaignState.heroName ?? "Parveen Siwach"}
                      </p>
                      <span className="rounded-full border border-[#f0c040]/20 bg-[#f0c040]/10 px-2 py-0.5 text-[10px] text-[#f0c040]">
                        ⚔️ Campaign Hero
                      </span>
                    </div>
                    <p className="text-[11px] text-[#888899]">
                      Rewari, Haryana • Leading with{" "}
                      {formatAmount(campaignState.heroAmount ?? 75400)}
                    </p>
                  </div>
                  <p className="max-w-xs text-[11px] text-[#444455]">
                    This campaign&apos;s top donor gets permanent hero status
                  </p>
                </div>
              </section>
            </>
          )}

          {activeTab === "milestones" && (
            <section className="mt-6 space-y-3">
              {campaignState.milestones.map((milestone) => (
                <div
                  className={`relative flex items-center gap-4 rounded-2xl border p-5 transition-all ${
                    milestone.unlocked
                      ? "border-[#f0c040]/20 bg-[#1a1a24]"
                      : "border-white/5 bg-[#0f0f0f] opacity-60"
                  }`}
                  key={milestone.id}
                >
                  {milestone.unlocked && (
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background:
                          "radial-gradient(circle at 0% 50%, rgba(240,192,64,0.04), transparent 60%)",
                      }}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-[22px] ${
                      milestone.unlocked
                        ? "border border-[#f0c040]/20 bg-[#f0c040]/10"
                        : "border border-white/[0.08] bg-white/[0.03]"
                    }`}
                  >
                    {milestone.unlocked ? milestone.emoji : "🔒"}
                  </div>

                  <div className="relative z-10 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p
                        className={`text-[14px] font-semibold ${
                          milestone.unlocked
                            ? "text-[#f0f0f0]"
                            : "text-[#888899]"
                        }`}
                      >
                        {milestone.title}
                      </p>
                      {milestone.unlocked && (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-[#4ade80]">
                          ✓ Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#888899]">
                      {milestone.description}
                    </p>
                  </div>

                  <div className="relative z-10 text-right">
                    <p
                      className={`text-[14px] font-semibold ${
                        milestone.unlocked ? "text-[#f0c040]" : "text-[#444455]"
                      }`}
                    >
                      ₹{(milestone.amount / 1000).toFixed(0)}K
                    </p>
                    <p className="text-[10px] text-[#444455]">target</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeTab === "challenges" && (
            <section className="mt-6 space-y-4">
              <button
                className="w-full rounded-xl border border-white/[0.08] py-3 text-[13px] font-medium text-[#888899] transition-all hover:border-[#f0c040]/30 hover:text-[#f0c040]"
                onClick={() => setShowChallengeModal(true)}
                type="button"
              >
                + Post a Challenge
              </button>

              {campaignState.challenges.map((challenge) => {
                const triggerRaised =
                  campaignState.stateBreakdown[challenge.triggerState || ""] || 0;
                const triggerPercent = Math.min(
                  (triggerRaised / challenge.triggerAmount) * 100,
                  100,
                );

                return (
                  <div
                    className="rounded-2xl border border-[#7c6af7]/20 bg-[#1a1a24] p-5"
                    key={challenge.id}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#7c6af7]/20 bg-[#7c6af7]/10 text-[13px] font-bold text-[#7c6af7]">
                        {getInitial(challenge.displayName)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#f0f0f0]">
                          {challenge.displayName}
                        </p>
                        <p className="text-[11px] text-[#888899]">
                          {challenge.state} • {challenge.createdAt}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 rounded-xl border-l-2 border-[#7c6af7]/40 bg-white/[0.03] p-3">
                      <p className="text-[13px] italic leading-relaxed text-[#f0f0f0]">
                        &ldquo;{challenge.message}&rdquo;
                      </p>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-[#444455]">
                          Trigger
                        </p>
                        <p className="text-[13px] font-semibold text-[#f0f0f0]">
                          {challenge.triggerState} hits{" "}
                          {formatAmount(challenge.triggerAmount)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-[#444455]">
                          Pledge
                        </p>
                        <p className="text-[13px] font-semibold text-[#f0c040]">
                          +{formatAmount(challenge.pledgeAmount)} more
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between gap-4">
                        <p className="text-[11px] text-[#444455]">
                          {challenge.triggerState} progress
                        </p>
                        <p className="text-[11px] text-[#f0c040]">
                          {formatAmount(triggerRaised)} /{" "}
                          {formatAmount(challenge.triggerAmount)}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, #7c6af7, #a78bfa)",
                            width: `${triggerPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {activeTab === "history" && (
            <section className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a24]">
                <div className="border-b border-[#f0c040]/10 bg-gradient-to-r from-[#1a1500] to-[#1a1a24] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-widest text-[#444455]">
                        Completed Campaign
                      </p>
                      <h3 className="text-[18px] font-semibold text-[#f0f0f0]">
                        {completedCampaign.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-[11px] text-[#444455]">
                        Total Raised
                      </p>
                      <p className="text-[18px] font-bold text-[#f0c040]">
                        {formatAmount(completedCampaign.totalRaised)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-[24px]">🏆</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#f0f0f0]">
                        {completedCampaign.winnerState} Won
                      </p>
                      <p className="text-[11px] text-[#888899]">
                        {formatAmount(completedCampaign.winnerAmount)} raised •{" "}
                        {completedCampaign.livesImpacted} lives impacted
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-[#f0c040]/10 bg-[#f0c040]/5 p-3">
                    <p className="mb-1 text-[11px] text-[#444455]">
                      Campaign Hero
                    </p>
                    <p className="text-[13px] font-semibold text-[#f0c040]">
                      {completedCampaign.heroName} —{" "}
                      {formatAmount(completedCampaign.heroAmount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {completedCampaign.impactProof.map((image) => (
                      <img
                        alt="Impact proof"
                        className="h-24 w-full rounded-xl object-cover"
                        key={image}
                        src={image}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mt-6 rounded-2xl border border-white/5 bg-[#0f0f0f] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <p className="text-[11px] uppercase tracking-widest text-blue-400">
                Coming Next Month
              </p>
            </div>
            <h3 className="mb-2 text-[18px] font-semibold text-[#f0f0f0]">
              {upcomingCampaign.title}
            </h3>
            <p className="mb-4 text-[13px] text-[#888899]">
              {upcomingCampaign.description}
            </p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-[#444455]">
                Starts {upcomingCampaign.startDate}
              </p>
              <button
                className="rounded-lg border border-blue-400/20 px-3 py-1.5 text-[12px] text-blue-400 transition-colors hover:bg-blue-400/5"
                type="button"
              >
                Notify Me →
              </button>
            </div>
          </section>
        </div>

        <CampaignDonateModal
          campaign={{
            heroAmount: campaignState.heroAmount ?? 75400,
            id: campaignState.id,
            title: campaignState.title,
          }}
          isOpen={showDonateModal}
          onClose={() => setShowDonateModal(false)}
          onSuccess={handleDonationSuccess}
          selectedState={selectedState}
          user={user}
        />
        <PostChallengeModal
          campaignId={campaignState.id}
          isOpen={showChallengeModal}
          onChallengePosted={handleChallengePosted}
          onClose={() => setShowChallengeModal(false)}
          user={user}
        />
      </main>
    </PageTransition>
  );
}
