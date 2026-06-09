"use client";

import { useState } from "react";
import { doc, increment, setDoc } from "firebase/firestore";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { saveWeeklyChampion } from "@/lib/hallOfFame";
import {
  addDonation,
  getWeeklyLeaderboard,
  updateUserDoc,
} from "@/lib/firestore";
import { checkAndAwardBadges } from "@/lib/badges";
import { updateStreak } from "@/lib/streak";
import { formatAmount, getCurrentWeek } from "@/lib/utils";
import { BADGES } from "@/types";

const presetAmounts = [100, 500, 1000, 5000];

interface DonationUser {
  uid: string;
  name?: string;
  email?: string;
  state?: string;
  district?: string;
  isAnonymous?: boolean;
  badges?: string[];
  currentWeekDonated?: number;
  lastDonationWeek?: string;
  streak?: number;
  totalDonated?: number;
}

interface DonateButtonProps {
  user?: DonationUser | null;
  onDonationSuccess?: (amount: number) => void;
  buttonClassName?: string;
  buttonLabel?: string;
  variant?: "fixed" | "inline";
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayCheckout {
  open: () => void;
}

interface LeaderboardEntry {
  userId?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getRankInfo(entries: LeaderboardEntry[], userId: string) {
  const rankIndex = entries.findIndex((entry) => entry.userId === userId);

  return {
    rank: rankIndex === -1 ? entries.length + 1 : rankIndex + 1,
    total: entries.length,
  };
}

function getBadgeName(badgeId: string) {
  return (
    Object.values(BADGES).find((badge) => badge.id === badgeId)?.name ??
    "Badge"
  );
}

export default function DonateButton({
  buttonClassName,
  buttonLabel = "⚡ Boost Your Rank",
  onDonationSuccess,
  user,
  variant = "fixed",
}: DonateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleDonate() {
    const selectedAmount = Number(amount);

    if (!Number.isFinite(selectedAmount) || selectedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!user?.uid) {
      toast.error("Please log in before donating.");
      return;
    }

    setIsLoading(true);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({ amount: selectedAmount }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to create payment order.");
      }

      const order = (await orderResponse.json()) as RazorpayOrder;
      const isScriptLoaded = await loadRazorpayScript();

      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const checkout = new window.Razorpay({
        amount: order.amount,
        currency: order.currency,
        description: "Boost Your Rank",
        handler: async (response) => {
          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              body: JSON.stringify({
                ...response,
                amount: selectedAmount,
                userId: user.uid,
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            });
            const verification = (await verifyResponse.json()) as {
              success?: boolean;
              verified?: boolean;
            };

            if (!verifyResponse.ok || !verification.verified) {
              toast.error("Payment verification failed");
              return;
            }

            const week = getCurrentWeek();

            await addDonation({
              amount: selectedAmount,
              district: user.district ?? "",
              state: user.state ?? "",
              userId: user.uid,
              week,
            });
            await updateUserDoc(user.uid, {
              currentWeekDonated: increment(selectedAmount),
              totalDonated: increment(selectedAmount),
            });

            console.log("Saving to leaderboard:", {
              district: user.district,
              state: user.state,
            });

            await setDoc(
              doc(db, "leaderboard_weekly", `${week}_${user.uid}`),
              {
                amount: increment(selectedAmount),
                displayName: user.isAnonymous ? "👻 Anonymous" : user.name,
                district: user.district,
                isAnonymous: user.isAnonymous,
                state: user.state,
                userId: user.uid,
                week,
              },
              { merge: true },
            );

            const newStreak = await updateStreak(user.uid, user);
            const updatedUser = {
              ...user,
              currentWeekDonated:
                (user.currentWeekDonated ?? 0) + selectedAmount,
              streak: newStreak,
              totalDonated: (user.totalDonated ?? 0) + selectedAmount,
            };
            const [districtLeaderboard, stateLeaderboard, nationalLeaderboard] =
              await Promise.all([
                user.district
                  ? getWeeklyLeaderboard("district", user.district)
                  : Promise.resolve([]),
                user.state
                  ? getWeeklyLeaderboard("state", user.state)
                  : Promise.resolve([]),
                getWeeklyLeaderboard("national"),
              ]);
            const originalBadges = user.badges ?? [];
            let updatedBadges = checkAndAwardBadges(
              { ...updatedUser, badges: originalBadges },
              Number.POSITIVE_INFINITY,
              0,
            );

            if (districtLeaderboard.length > 0) {
              const districtRank = getRankInfo(
                districtLeaderboard as LeaderboardEntry[],
                user.uid,
              );
              await saveWeeklyChampion(
                updatedUser,
                "district",
                districtRank.rank,
              );
              updatedBadges = checkAndAwardBadges(
                { ...updatedUser, badges: updatedBadges },
                districtRank.rank,
                districtRank.total,
                "district",
              );
            }

            if (stateLeaderboard.length > 0) {
              const stateRank = getRankInfo(
                stateLeaderboard as LeaderboardEntry[],
                user.uid,
              );
              await saveWeeklyChampion(updatedUser, "state", stateRank.rank);
              updatedBadges = checkAndAwardBadges(
                { ...updatedUser, badges: updatedBadges },
                stateRank.rank,
                stateRank.total,
                "state",
              );
            }

            if (nationalLeaderboard.length > 0) {
              const nationalRank = getRankInfo(
                nationalLeaderboard as LeaderboardEntry[],
                user.uid,
              );
              await saveWeeklyChampion(
                updatedUser,
                "national",
                nationalRank.rank,
              );
              updatedBadges = checkAndAwardBadges(
                { ...updatedUser, badges: updatedBadges },
                nationalRank.rank,
                nationalRank.total,
                "national",
              );
            }

            const newBadgeIds = updatedBadges.filter(
              (badgeId) => !originalBadges.includes(badgeId),
            );

            if (newBadgeIds.length > 0) {
              await updateUserDoc(user.uid, { badges: updatedBadges });
              newBadgeIds.forEach((badgeId) => {
                toast.success(`🎯 New Badge: ${getBadgeName(badgeId)}!`);
              });
            }

            toast.success("🎉 Rank boosted!");
            setIsOpen(false);
            setAmount("");
            onDonationSuccess?.(selectedAmount);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Payment verification failed",
            );
          } finally {
            setIsLoading(false);
          }
        },
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        modal: {
          ondismiss: () => setIsLoading(false),
        },
        name: "WeClout",
        order_id: order.id,
        prefill: {
          email: user.email,
          name: user.name,
        },
        theme: {
          color: "#f0c040",
        },
      });

      checkout.open();
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Unable to start payment.",
      );
    }
  }

  return (
    <>
      <button
        className={
          buttonClassName ??
          (variant === "inline"
            ? "inline-flex items-center justify-center rounded-xl bg-[#f0c040] px-8 py-2.5 text-[13px] font-semibold text-black shadow-lg shadow-[#f0c040]/10 transition hover:bg-[#ffe680]"
            : "fixed bottom-8 right-8 z-30 hidden animate-pulse rounded-full bg-[#f0c040] px-4 py-4 font-bold text-[#111118] shadow-lg shadow-[#f0c040]/20 transition hover:bg-[#ffd75e] md:inline-flex")
        }
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 sm:px-6">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#151522] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Choose Amount</h2>
              <button
                aria-label="Close donation modal"
                className="rounded-lg border border-white/10 p-2 text-[#888899] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {presetAmounts.map((presetAmount) => (
                <button
                  className={`rounded-lg border px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    amount === String(presetAmount)
                      ? "border-[#f0c040] bg-[#f0c040] text-[#111118]"
                      : "border-white/10 bg-white/[0.04] text-white hover:border-[#f0c040]/60"
                  }`}
                  disabled={isLoading}
                  key={presetAmount}
                  onClick={() => setAmount(String(presetAmount))}
                  type="button"
                >
                  {formatAmount(presetAmount)}
                </button>
              ))}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-[#f0f0f0]/80">
                Custom amount
              </span>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-[#444455] focus:border-[#f0c040] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                type="number"
                value={amount}
              />
            </label>

            <button
              className="mt-5 w-full rounded-lg bg-[#f0c040] py-3 font-bold text-[#111118] transition hover:bg-[#ffd75e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!amount || isLoading}
              onClick={handleDonate}
              type="button"
            >
              {isLoading ? "Opening checkout..." : "Donate Now"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
