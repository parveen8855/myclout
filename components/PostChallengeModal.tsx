"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { formatAmount } from "@/lib/utils";

interface PostChallengeModalProps {
  campaignId: string;
  isOpen: boolean;
  onChallengePosted: (challenge: {
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
  }) => void;
  onClose: () => void;
  user?: {
    uid?: string;
    name?: string;
    displayName?: string;
    state?: string;
  } | null;
}

const pledgeAmounts = [5000, 10000, 25000];
const states = ["Haryana", "Punjab", "Delhi", "UP", "Bihar", "Rajasthan"];

export default function PostChallengeModal({
  campaignId,
  isOpen,
  onChallengePosted,
  onClose,
  user,
}: PostChallengeModalProps) {
  const [message, setMessage] = useState("");
  const [pledgeAmount, setPledgeAmount] = useState("10000");
  const [triggerState, setTriggerState] = useState(user?.state || "Haryana");
  const [triggerAmount, setTriggerAmount] = useState("300000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.uid) {
      toast.error("Login before posting a challenge.");
      return;
    }

    const selectedPledge = Number(pledgeAmount);
    const selectedTrigger = Number(triggerAmount);

    if (!message.trim()) {
      toast.error("Write a challenge message first.");
      return;
    }

    if (!Number.isFinite(selectedPledge) || selectedPledge < 1000) {
      toast.error("Pledge amount must be at least ₹1,000.");
      return;
    }

    if (!Number.isFinite(selectedTrigger) || selectedTrigger < 10000) {
      toast.error("Trigger amount must be at least ₹10,000.");
      return;
    }

    setIsSubmitting(true);

    try {
      const displayName = user.name ?? user.displayName ?? "WeClout Warrior";
      const challenge = {
        accepted: true,
        campaignId,
        createdAt: serverTimestamp(),
        displayName,
        fulfilled: false,
        message: message.trim(),
        pledgeAmount: selectedPledge,
        state: user.state ?? triggerState,
        triggerAmount: selectedTrigger,
        triggerState,
        userId: user.uid,
      };
      const challengeRef = await addDoc(collection(db, "challenges"), challenge);

      onChallengePosted({
        ...challenge,
        createdAt: "Just now",
        id: challengeRef.id,
      });
      toast.success("💪 Challenge posted!");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to post challenge.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#7c6af7]">
              War Room Challenge
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Post a Challenge
            </h2>
          </div>
          <button
            aria-label="Close challenge modal"
            className="rounded-lg border border-white/10 p-2 text-[#888899] transition hover:text-white"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <textarea
            className="min-h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none placeholder:text-[#444455] focus:border-[#7c6af7]"
            disabled={isSubmitting}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Agar Haryana 3 lakh cross kare toh..."
            value={message}
          />

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-[#444455]">
              Pledge Amount
            </p>
            <div className="grid grid-cols-3 gap-2">
              {pledgeAmounts.map((amount) => (
                <button
                  className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
                    pledgeAmount === String(amount)
                      ? "border-[#7c6af7] bg-[#7c6af7]/20 text-[#f0f0f0]"
                      : "border-white/10 text-[#888899] hover:border-[#7c6af7]/40 hover:text-white"
                  }`}
                  disabled={isSubmitting}
                  key={amount}
                  onClick={() => setPledgeAmount(String(amount))}
                  type="button"
                >
                  {formatAmount(amount)}
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none placeholder:text-[#444455] focus:border-[#7c6af7]"
              disabled={isSubmitting}
              min={1000}
              onChange={(event) => setPledgeAmount(event.target.value)}
              placeholder="Custom pledge"
              type="number"
              value={pledgeAmount}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-[11px] uppercase tracking-widest text-[#444455]">
                Trigger State
              </span>
              <select
                className="w-full rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none focus:border-[#7c6af7]"
                disabled={isSubmitting}
                onChange={(event) => setTriggerState(event.target.value)}
                value={triggerState}
              >
                {states.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-[11px] uppercase tracking-widest text-[#444455]">
                Trigger Amount
              </span>
              <input
                className="w-full rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none placeholder:text-[#444455] focus:border-[#7c6af7]"
                disabled={isSubmitting}
                min={10000}
                onChange={(event) => setTriggerAmount(event.target.value)}
                type="number"
                value={triggerAmount}
              />
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12px] text-[#888899]">
            When {triggerState} raises {formatAmount(Number(triggerAmount) || 0)}, I pledge{" "}
            <span className="text-[#f0c040]">
              {formatAmount(Number(pledgeAmount) || 0)}
            </span>
            .
          </div>

          <button
            className="w-full rounded-xl border border-[#7c6af7]/30 bg-[#7c6af7]/15 py-3 text-[13px] font-semibold text-[#f0f0f0] transition hover:bg-[#7c6af7]/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Posting..." : "Post Challenge"}
          </button>
        </form>
      </div>
    </div>
  );
}
