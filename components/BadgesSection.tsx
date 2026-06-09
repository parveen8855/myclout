"use client";

import { useState } from "react";
import { BADGES } from "@/types";

interface BadgesSectionProps {
  user?: {
    badges?: string[];
  } | null;
}

const badges = Object.values(BADGES);

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const playLockedSound = () => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const ctx = new AudioContextConstructor();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.setValueAtTime(300, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    150,
    ctx.currentTime + 0.1,
  );
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.1);
};

const playEarnedSound = () => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const ctx = new AudioContextConstructor();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.25);
  gain2.gain.setValueAtTime(0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.3);
};

export default function BadgesSection({ user }: BadgesSectionProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  const earnedBadges = user?.badges ?? [];
  const earnedCount = badges.filter((badge) =>
    earnedBadges.includes(badge.id),
  ).length;
  const earnedPercent = badges.length > 0 ? (earnedCount / badges.length) * 100 : 0;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Your Badges</h2>
        <p className="mt-2 text-sm text-[#888899]">
          {earnedCount} of {badges.length} badges unlocked
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[#f0c040] transition-all duration-1000"
            style={{ width: `${earnedPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {badges.map((badge, index) => {
          const isEarned = earnedBadges.includes(badge.id);
          const isHovered = hoveredBadge === badge.id;

          if (isEarned) {
            return (
              <div
                className="relative rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer border transition-all duration-200"
                key={badge.id}
                onMouseEnter={() => {
                  setHoveredBadge(badge.id);
                  playEarnedSound();
                }}
                onMouseLeave={() => setHoveredBadge(null)}
                style={{
                  animationDelay: `${index * 50}ms`,
                  background: isHovered
                    ? "linear-gradient(135deg, #2a2a1a, #1a1a0a)"
                    : "#1a1a24",
                  borderColor: isHovered
                    ? "#f0c040"
                    : "rgba(240,192,64,0.2)",
                  boxShadow: isHovered
                    ? "0 0 25px rgba(240,192,64,0.5), 0 0 50px rgba(240,192,64,0.2)"
                    : "none",
                  opacity: 1,
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                }}
              >
                {isHovered && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-[#f0c040]/30 bg-[#1a1a24] px-3 py-2 text-xs text-white shadow-xl shadow-black/30">
                    <span className="whitespace-nowrap">
                      {badge.description} ✅
                    </span>
                  </div>
                )}

                <span
                  className={`transition-all duration-200 ${
                    isHovered ? "text-5xl" : "text-4xl"
                  }`}
                >
                  {badge.emoji}
                </span>
                <span className="text-center text-xs font-semibold text-[#f0c040]">
                  {badge.name}
                </span>
                <span
                  className={`text-center text-xs text-[#888899] ${
                    isHovered ? "block" : "hidden sm:block"
                  }`}
                >
                  {badge.description}
                </span>
              </div>
            );
          }

          return (
            <button
              className="group relative flex cursor-not-allowed flex-col items-center gap-2 overflow-visible rounded-2xl border border-white/[0.08] bg-[#111111] p-4 opacity-35 transition-all duration-200 hover:scale-105 hover:border-2 hover:border-gray-600 hover:bg-[#1a1a1a] hover:opacity-40"
              key={badge.id}
              onMouseEnter={playLockedSound}
              style={{ animationDelay: `${index * 50}ms` }}
              type="button"
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-[#f0c040]/30 bg-[#1a1a24] px-3 py-2 text-xs text-white shadow-xl shadow-black/30 group-hover:block">
                <span className="whitespace-nowrap">
                  {`Earn this by: ${badge.description}`}
                </span>
              </div>

              <span className="absolute right-1 top-1 text-xs text-[#444455]">
                🔒
              </span>

              <span className="text-4xl filter grayscale transition-all duration-200">
                {badge.emoji}
              </span>
              <span className="text-center text-xs font-semibold text-[#444455]">
                {badge.name}
              </span>
              <span className="hidden text-center text-xs text-[#888899] group-hover:block sm:block">
                {badge.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
