"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { db } from "@/lib/firebase";
import {
  addDonation,
  getWeeklyLeaderboard,
  updateUserDoc,
} from "@/lib/firestore";
import { openRazorpay } from "@/lib/razorpay";
import { updateStreak } from "@/lib/streak";
import { formatAmount, getCurrentWeek } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

type HeroPhase = "typing" | "pause" | "fade" | "answer" | "logo" | "button";

interface DonationItem {
  id: string;
  amount?: number;
  createdAt?: unknown;
  displayName?: string;
  district?: string;
  isAnonymous?: boolean;
  state?: string;
}

interface Particle {
  delay: number;
  duration: number;
  id: number;
  left: number;
  size: number;
}

const presetAmounts = [100, 500, 1000, 2000];

const impactByAmount: Record<number, string> = {
  100: "Ek bacche ka ek din ka khana",
  500: "Ek family ki ek hafte ki zaroorat",
  1000: "10 janwaron ka ek hafte ka khana",
  2000: "Ek bacche ki ek mahine ki padhai",
};

function toDate(value?: unknown) {
  return value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : (value as { toDate?: () => Date } | undefined)?.toDate?.();
}

function timeAgo(value?: unknown) {
  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "abhi";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  return `${Math.floor(hours / 24)} days ago`;
}

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function getDonationImpact(amount: number, isCustom: boolean) {
  if (isCustom || !impactByAmount[amount]) {
    return "Tera dil jaane";
  }

  return impactByAmount[amount];
}

function getRegionalPainCards(state?: string) {
  const isDelhiNcr = ["Delhi", "New Delhi", "Haryana", "Uttar Pradesh"].includes(
    state ?? "",
  );

  return [
    {
      icon: "🍽️",
      impact: "Tera ek donation ek family ka ek waqt ka khana ban sakta hai",
      source: "Source: UN World Food Programme 2023",
      stat: "India mein 19 crore log roz raat ko bhooke sote hain",
    },
    {
      icon: "🐕",
      impact: isDelhiNcr
        ? "₹50 mein ek janwar ka ek din ka khana"
        : "₹50 mein ek janwar ka ek din ka khana",
      source: isDelhiNcr
        ? "Source: MCD Census"
        : "Source: Animal Welfare Board of India",
      stat: isDelhiNcr
        ? "Delhi mein 4 lakh awaara kutte hain jinhein roz khana nahi milta"
        : "India mein 6.2 crore awaara janwar hain",
    },
    {
      icon: "📚",
      impact: "₹200 mein ek bacche ki ek mahine ki stationery",
      source: "Source: UNICEF India 2022",
      stat: "India mein 1.4 crore bachon ne school chhod diya — sirf isliye kyunki ghar mein paisa nahi tha",
    },
  ];
}

function ScrollArrow() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#f0c040]/70">
      <div className="home-scroll-arrow text-3xl">↓</div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [typedText, setTypedText] = useState("");
  const [heroPhase, setHeroPhase] = useState<HeroPhase>("typing");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [metrics, setMetrics] = useState({
    donorsEver: 0,
    totalAllTime: 0,
    totalThisWeek: 0,
  });
  const [recentDonations, setRecentDonations] = useState<DonationItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [thankYouAmount, setThankYouAmount] = useState(0);
  const firstName = getFirstName(user?.name ?? user?.displayName);
  const question = firstName
    ? `Aakhri baar kab tune kisi ke liye kuch kiya, ${firstName}?`
    : "Aakhri baar kab tune kisi ke liye kuch kiya?";
  const stateLabel = user?.state ? user.state : "India";
  const regionalPainCards = useMemo(
    () => getRegionalPainCards(user?.state),
    [user?.state],
  );
  const amountToPay = isCustomAmount ? Number(customAmount) : selectedAmount;
  const impactText = getDonationImpact(amountToPay, isCustomAmount);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, index) => ({
        delay: (index % 10) * 0.7,
        duration: 9 + (index % 7),
        id: index,
        left: (index * 37) % 100,
        size: 2 + (index % 3),
      })),
    );
  }, []);

  useEffect(() => {
    setTypedText("");
    setHeroPhase("typing");
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setTypedText(question.slice(0, index));

      if (index >= question.length) {
        window.clearInterval(interval);
        setHeroPhase("pause");
        window.setTimeout(() => setHeroPhase("fade"), 2000);
        window.setTimeout(() => setHeroPhase("answer"), 2800);
        window.setTimeout(() => setHeroPhase("logo"), 3800);
        window.setTimeout(() => setHeroPhase("button"), 4800);
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [question]);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [leaderboardSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "leaderboard_weekly")),
          getDocs(collection(db, "users")),
        ]);

        const totalThisWeek = leaderboardSnapshot.docs.reduce(
          (sum, entry) => sum + Number(entry.data().amount ?? 0),
          0,
        );
        const totalAllTime = usersSnapshot.docs.reduce(
          (sum, entry) => sum + Number(entry.data().totalDonated ?? 0),
          0,
        );

        setMetrics({
          donorsEver: usersSnapshot.size,
          totalAllTime,
          totalThisWeek,
        });
      } catch (error) {
        console.log("Home metrics load error:", error);
      }
    }

    loadMetrics();
  }, [thankYouAmount]);

  useEffect(() => {
    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(5),
    );
    const unsubscribe = onSnapshot(
      donationsQuery,
      (snapshot) => {
        setRecentDonations(
          snapshot.docs.map((donationDoc) => ({
            id: donationDoc.id,
            ...donationDoc.data(),
          })) as DonationItem[],
        );
      },
      (error) => {
        console.log("Recent donations listener error:", error);
      },
    );

    return unsubscribe;
  }, []);

  function openDonationModal() {
    setModalOpen(true);
    setThankYouOpen(false);
  }

  function choosePreset(amount: number) {
    setSelectedAmount(amount);
    setCustomAmount("");
    setIsCustomAmount(false);
  }

  async function handlePayNow() {
    if (!user?.uid) {
      toast.error("Donate karne ke liye pehle login kar.");
      router.push("/login");
      return;
    }

    if (!Number.isFinite(amountToPay) || amountToPay < 1) {
      toast.error("Valid amount select kar.");
      return;
    }

    setIsPaying(true);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({
          amount: amountToPay,
          currency: "INR",
          receipt: `home_${user.uid.slice(0, 8)}_${Date.now()}`,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to create payment order.");
      }

      const order = (await orderResponse.json()) as {
        id?: string;
        orderId?: string;
      };
      const orderId = order.orderId ?? order.id;

      if (!orderId) {
        throw new Error("Payment order id missing.");
      }

      await openRazorpay({
        amount: amountToPay,
        description: "WeClout donation",
        name: "WeClout",
        onDismiss: () => setIsPaying(false),
        onSuccess: async (_paymentId, response) => {
          const verifyResponse = await fetch("/api/verify-payment", {
            body: JSON.stringify({
              amount: amountToPay,
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
            throw new Error("Payment verification failed.");
          }

          const week = getCurrentWeek();
          const displayName = user.isAnonymous
            ? "👻 Anonymous"
            : user.name ?? user.displayName ?? "WeClout Donor";

          await addDonation({
            amount: amountToPay,
            displayName,
            district: user.district ?? "",
            isAnonymous: Boolean(user.isAnonymous),
            state: user.state ?? "",
            userId: user.uid,
            week,
          });

          await updateUserDoc(user.uid, {
            currentWeekDonated: increment(amountToPay),
            totalDonated: increment(amountToPay),
          });

          await setDoc(
            doc(db, "leaderboard_weekly", `${week}_${user.uid}`),
            {
              amount: increment(amountToPay),
              displayName,
              district: user.district ?? "",
              isAnonymous: Boolean(user.isAnonymous),
              state: user.state ?? "",
              userId: user.uid,
              week,
            },
            { merge: true },
          );

          await updateStreak(user.uid, {
            badges: user.badges ?? [],
            currentWeekDonated: user.currentWeekDonated ?? 0,
            district: user.district ?? "",
            isAnonymous: Boolean(user.isAnonymous),
            lastDonationWeek: user.lastDonationWeek,
            name: user.name ?? user.displayName ?? "WeClout Donor",
            state: user.state ?? "",
            streak: user.streak ?? 0,
            totalDonated: user.totalDonated ?? 0,
            uid: user.uid,
          });

          await getWeeklyLeaderboard("national");
          await refreshUser(user.uid);
          setThankYouAmount(amountToPay);
          setThankYouOpen(true);
          setModalOpen(false);
          setIsPaying(false);
          toast.success("Tune aaj fark kiya.");
        },
        orderId,
        prefill: {
          email: user.email ?? "",
          name: user.name ?? user.displayName ?? "WeClout Donor",
        },
      });
    } catch (error) {
      setIsPaying(false);
      toast.error(error instanceof Error ? error.message : "Payment failed.");
    }
  }

  async function shareImpact() {
    const shareText = `Maine WeClout par ${formatAmount(thankYouAmount)} donate kiya. ${getDonationImpact(thankYouAmount, !impactByAmount[thankYouAmount])}`;

    if (navigator.share) {
      await navigator.share({
        text: shareText,
        title: "WeClout Impact",
        url: window.location.origin,
      });
      return;
    }

    await navigator.clipboard.writeText(shareText);
    toast.success("Impact copied!");
  }

  return (
    <PageTransition>
      <main className="overflow-hidden bg-[#0a0a1a] text-white">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-center">
          <div className="pointer-events-none absolute inset-0">
            {particles.map((particle) => (
              <span
                className="home-hero-particle"
                key={particle.id}
                style={{
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  height: `${particle.size}px`,
                  left: `${particle.left}%`,
                  width: `${particle.size}px`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 mx-auto max-w-5xl">
            <p
              className={`mx-auto min-h-[120px] max-w-4xl text-balance text-[clamp(28px,4vw,48px)] font-light italic leading-tight text-white transition-opacity duration-700 ${
                heroPhase === "fade" || heroPhase === "answer" || heroPhase === "logo" || heroPhase === "button"
                  ? "opacity-0"
                  : "opacity-100"
              }`}
            >
              {typedText}
              {heroPhase === "typing" && (
                <span className="ml-1 animate-pulse text-[#f0c040]">|</span>
              )}
            </p>

            <div
              className={`transition-all duration-700 ${
                heroPhase === "answer" || heroPhase === "logo" || heroPhase === "button"
                  ? "translate-y-0 opacity-100"
                  : "translate-y-6 opacity-0"
              }`}
            >
              <h1 className="text-[clamp(48px,8vw,80px)] font-bold tracking-tight text-[#f0c040]">
                Aaj kar.
              </h1>
            </div>

            <div
              className={`mt-6 transition-opacity duration-700 ${
                heroPhase === "logo" || heroPhase === "button"
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              <p className="text-[32px] font-bold tracking-tight">
                <span className="text-white">We</span>
                <span className="gold-shimmer">Clout</span>
              </p>
            </div>

            <div
              className={`mt-8 transition-all duration-700 ${
                heroPhase === "button"
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <button
                className="min-h-12 rounded-full bg-[#f0c040] px-8 text-[15px] font-bold text-black shadow-[0_0_40px_rgba(240,192,64,0.24)] transition hover:bg-[#ffe680]"
                onClick={openDonationModal}
                type="button"
              >
                Donate Now
              </button>
            </div>
          </div>

          {heroPhase === "button" && <ScrollArrow />}
        </section>

        <section className="px-4 py-20 sm:px-6 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#f0c040]/65">
                {stateLabel}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Teri state ki sachchi tasveer
              </h2>
              <p className="mt-4 text-[#888899]">
                Yeh numbers sirf numbers nahi — yeh log hain
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {regionalPainCards.map((card) => (
                <article
                  className="card-shine rounded-2xl border border-white/[0.08] border-l-[#f0c040]/70 bg-[#111827] p-5"
                  key={card.stat}
                >
                  <div className="text-3xl">{card.icon}</div>
                  <p className="mt-5 text-xl font-semibold leading-snug text-[#f0c040]">
                    {card.stat}
                  </p>
                  <p className="mt-3 text-[11px] italic text-[#6b7280]">
                    {card.source}
                  </p>
                  <p className="mt-5 text-sm leading-6 text-white">
                    {card.impact}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-[#111118] px-4 py-20 sm:px-6 md:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              WeClout community ne kya kiya
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-6">
                <p className="text-3xl font-bold text-[#f0c040]">
                  {formatAmount(metrics.totalThisWeek)}
                </p>
                <p className="mt-2 text-sm text-[#888899]">
                  Total donations this week
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-6">
                <p className="text-3xl font-bold text-[#f0c040]">
                  {metrics.donorsEver.toLocaleString("en-IN")}
                </p>
                <p className="mt-2 text-sm text-[#888899]">
                  Total donors ever
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-6">
                <p className="text-3xl font-bold text-[#f0c040]">
                  {formatAmount(metrics.totalAllTime)}
                </p>
                <p className="mt-2 text-sm text-[#888899]">
                  Total donated all time
                </p>
              </div>
            </div>
            <p className="mt-8 text-lg italic text-[#f0c040]">
              Har rupya yahan aata hai, wahan jaata hai — beech mein koi nahi
            </p>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center gap-3 text-center">
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Abhi kaun donate kar raha hai
              </h2>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1a1a24] p-3 sm:p-5">
              {recentDonations.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#888899]">
                  Pehli live donation ka wait hai.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentDonations.map((donation, index) => {
                    const name = donation.isAnonymous
                      ? `Someone from ${donation.state ?? "India"}`
                      : donation.displayName ?? `Someone from ${donation.state ?? "India"}`;

                    return (
                      <div
                        className="home-donation-feed-item rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-[#d8d8df]"
                        key={donation.id}
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <span className="font-semibold text-white">{name}</span>
                        {" from "}
                        <span className="text-[#888899]">
                          {[donation.district, donation.state]
                            .filter(Boolean)
                            .join(", ") || "India"}
                        </span>
                        {" donated "}
                        <span className="font-semibold text-[#f0c040]">
                          {formatAmount(Number(donation.amount ?? 0))}
                        </span>
                        {" — "}
                        <span className="text-[#888899]">
                          {timeAgo(donation.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-8 text-center text-lg text-white">
              Bann ja unka hissa jo fark karte hain
            </p>
            <div className="mt-6 flex justify-center">
              <button
                className="min-h-12 rounded-full bg-[#f0c040] px-8 text-[15px] font-bold text-black transition hover:bg-[#ffe680]"
                onClick={openDonationModal}
                type="button"
              >
                Donate Now
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[#111118] px-4 py-20 sm:px-6 md:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Kitna aasaan hai
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                ["Choose karo", "kitna donate karna hai (₹100, ₹500, ₹1000, custom)"],
                ["Pay karo", "UPI, card, netbanking — 30 seconds"],
                ["Fark dekho", "tera paisa kahan gaya, real proof"],
              ].map(([title, description], index) => (
                <div
                  className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-6 text-left"
                  key={title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0c040] text-sm font-bold text-black">
                    {index + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#888899]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-lg text-[#d8d8df]">
              Bas itna hi. Koi form nahi. Koi jhanjhat nahi.
            </p>
          </div>
        </section>

        <section className="bg-gradient-to-b from-[#111118] to-[#1a1500] px-4 py-24 text-center sm:px-6 md:px-8">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Ek baar try kar.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg italic text-[#888899]">
            Agar feel nahi aaya toh mat karna dobara. But try toh kar.
          </p>
          <button
            className="mt-8 min-h-14 rounded-full bg-[#f0c040] px-8 text-[16px] font-bold text-black shadow-[0_0_50px_rgba(240,192,64,0.24)] transition hover:bg-[#ffe680]"
            onClick={openDonationModal}
            type="button"
          >
            Donate Now — ₹100 se shuru
          </button>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#888899]">
            UPI • Card • Net Banking • 30 seconds
          </p>
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl shadow-black/60">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#f0c040]/70">
                    Quick Donation
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Kitna fark karna hai?
                  </h2>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-[#888899] transition hover:text-white"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {presetAmounts.map((amount) => (
                  <button
                    className={`min-h-12 rounded-2xl border text-sm font-semibold transition ${
                      !isCustomAmount && selectedAmount === amount
                        ? "border-[#f0c040] bg-[#f0c040] text-black"
                        : "border-white/[0.08] bg-[#1a1a24] text-white hover:border-[#f0c040]/40"
                    }`}
                    key={amount}
                    onClick={() => choosePreset(amount)}
                    type="button"
                  >
                    {formatAmount(amount)}
                  </button>
                ))}
              </div>

              <input
                className="mt-4 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-[#1a1a24] px-4 text-white outline-none transition placeholder:text-[#444455] focus:border-[#f0c040]/50"
                inputMode="numeric"
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  setIsCustomAmount(true);
                }}
                placeholder="Custom amount"
                type="number"
                value={customAmount}
              />

              <div className="mt-5 rounded-2xl border border-[#f0c040]/20 bg-[#f0c040]/10 p-4">
                <p className="text-[11px] uppercase tracking-widest text-[#f0c040]/70">
                  Your impact
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {impactText}
                </p>
              </div>

              <button
                className="mt-5 min-h-12 w-full rounded-2xl bg-[#f0c040] text-sm font-bold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPaying}
                onClick={handlePayNow}
                type="button"
              >
                {isPaying ? "Opening payment..." : "Pay Now"}
              </button>
            </div>
          </div>
        )}

        {thankYouOpen && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/85 p-4 backdrop-blur-sm">
            {Array.from({ length: 24 }).map((_, index) => (
              <span
                className="home-thank-confetti"
                key={index}
                style={{
                  animationDelay: `${index * 45}ms`,
                  background: ["#f0c040", "#7c6af7", "#22c55e", "#ffffff"][
                    index % 4
                  ],
                  left: `${(index * 19) % 100}%`,
                }}
              />
            ))}
            <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#f0c040]/25 bg-[#111118] p-8 text-center shadow-2xl shadow-black/60">
              <h2 className="text-4xl font-bold text-[#f0c040]">
                Shukriya {firstName || "dost"} 🙏
              </h2>
              <p className="mt-4 text-2xl font-semibold text-white">
                Tune aaj fark kiya
              </p>
              <p className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[#d8d8df]">
                {getDonationImpact(
                  thankYouAmount,
                  !impactByAmount[thankYouAmount],
                )}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  className="min-h-11 rounded-full bg-[#f0c040] px-6 text-sm font-bold text-black"
                  onClick={shareImpact}
                  type="button"
                >
                  Share your impact
                </button>
                <button
                  className="min-h-11 rounded-full border border-white/[0.08] px-6 text-sm font-semibold text-white"
                  onClick={() => setThankYouOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
