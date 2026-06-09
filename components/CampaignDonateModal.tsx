"use client";

import { FormEvent, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { formatAmount } from "@/lib/utils";

interface CampaignDonateModalProps {
  campaign: {
    id: string;
    title: string;
    heroAmount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, state: string, district: string) => void;
  selectedState?: string;
  user?: {
    uid?: string;
    name?: string;
    displayName?: string;
    email?: string;
    state?: string;
    district?: string;
    isAnonymous?: boolean;
  } | null;
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
  modal: {
    ondismiss: () => void;
  };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
}

interface RazorpayCheckout {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const presetAmounts = [500, 1000, 2500, 5000, 10000];

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

export default function CampaignDonateModal({
  campaign,
  isOpen,
  onClose,
  onSuccess,
  selectedState,
  user,
}: CampaignDonateModalProps) {
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(Boolean(user?.isAnonymous));
  const [isLoading, setIsLoading] = useState(false);
  const selectedAmount = Number(amount);
  const state = selectedState || user?.state || "India";
  const district = user?.district || "Unknown";

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.uid) {
      toast.error("Login before joining the War Room.");
      return;
    }

    if (!Number.isFinite(selectedAmount) || selectedAmount < 100) {
      toast.error("Minimum campaign donation is ₹100.");
      return;
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!razorpayKey) {
      toast.error("Payment gateway is not configured.");
      return;
    }

    setIsLoading(true);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({ amount: selectedAmount, type: "campaign" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to create payment order.");
      }

      const order = (await orderResponse.json()) as RazorpayOrder;
      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      let paymentCompleted = false;
      const checkout = new window.Razorpay({
        amount: order.amount,
        currency: order.currency,
        description: `War Room — ${campaign.title}`,
        handler: async (response) => {
          paymentCompleted = true;
          setIsLoading(true);

          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              body: JSON.stringify({
                amount: selectedAmount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
              }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });
            const verification = (await verifyResponse.json()) as {
              verified?: boolean;
            };

            if (!verifyResponse.ok || !verification.verified) {
              toast.error("Payment verification failed.");
              return;
            }

            const displayName = isAnonymous
              ? "Anonymous"
              : user.name ?? user.displayName ?? "WeClout Warrior";

            await addDoc(collection(db, "campaign_donations"), {
              amount: selectedAmount,
              campaignId: campaign.id,
              createdAt: serverTimestamp(),
              displayName,
              district,
              isAnonymous,
              message: message.trim() || "",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              state,
              userId: user.uid,
            });

            const campaignRef = doc(db, "campaigns", campaign.id);
            await setDoc(
              campaignRef,
              {
                districtBreakdown: {
                  [district]: increment(selectedAmount),
                },
                stateBreakdown: {
                  [state]: increment(selectedAmount),
                },
                totalRaised: increment(selectedAmount),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );

            if (selectedAmount > (campaign.heroAmount ?? 0)) {
              await setDoc(
                campaignRef,
                {
                  heroAmount: selectedAmount,
                  heroName: displayName,
                  heroUserId: user.uid,
                },
                { merge: true },
              );
            }

            toast.success(`⚔️ Fighting for ${state}!`);
            onSuccess(selectedAmount, state, district);
            onClose();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to save campaign donation.",
            );
          } finally {
            setIsLoading(false);
          }
        },
        key: razorpayKey,
        modal: {
          ondismiss: () => {
            if (!paymentCompleted) {
              setIsLoading(false);
              toast.error("Payment cancelled");
            }
          },
        },
        name: "WeClout",
        order_id: order.id,
        prefill: {
          email: user.email,
          name: user.name ?? user.displayName,
        },
        theme: { color: "#f0c040" },
      });

      checkout.open();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Unable to open payment.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-red-400">
              War Room Donation
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Fight for {state}
            </h2>
          </div>
          <button
            aria-label="Close campaign donation modal"
            className="rounded-lg border border-white/10 p-2 text-[#888899] transition hover:text-white"
            disabled={isLoading}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {presetAmounts.map((preset) => (
              <button
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
                  amount === String(preset)
                    ? "border-[#f0c040] bg-[#f0c040] text-black"
                    : "border-white/10 bg-white/[0.03] text-[#888899] hover:border-[#f0c040]/30 hover:text-[#f0c040]"
                }`}
                disabled={isLoading}
                key={preset}
                onClick={() => setAmount(String(preset))}
                type="button"
              >
                {formatAmount(preset)}
              </button>
            ))}
          </div>

          <input
            className="w-full rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none placeholder:text-[#444455] focus:border-[#f0c040]/60"
            disabled={isLoading}
            min={100}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Custom amount"
            type="number"
            value={amount}
          />

          <textarea
            className="min-h-24 w-full resize-none rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-3 text-white outline-none placeholder:text-[#444455] focus:border-[#f0c040]/60"
            disabled={isLoading}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Message for your state..."
            value={message}
          />

          <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-[#888899]">
            Donate anonymously
            <input
              checked={isAnonymous}
              disabled={isLoading}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              type="checkbox"
            />
          </label>

          <button
            className="w-full rounded-xl bg-[#f0c040] py-3 text-[14px] font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Opening Payment..." : `Donate ${formatAmount(selectedAmount || 0)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
