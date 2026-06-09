"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ImpactMap from "@/components/ImpactMap";
import PageTransition from "@/components/PageTransition";
import { formatAmount } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface ImpactComment {
  name: string;
  text: string;
  time: string;
}

interface ImpactPost {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  amountUsed: number;
  livesImpacted: number;
  ngo: string;
  image: string;
  beforeImage: string;
  afterImage: string;
  beneficiaryQuote: string;
  donors: string[];
  likes: number;
  dislikes: number;
  comments: ImpactComment[];
  shares: number;
}

const impactPosts: ImpactPost[] = [
  {
    id: "1",
    title: "47 Children Fed This Diwali 🪔",
    description:
      "This Diwali, thanks to WeClout donors from Haryana, we partnered with Seva Foundation to ensure 47 underprivileged children in Rewari had a proper meal and sweets. For many, this was their first Diwali celebration. The smiles on their faces were priceless. Your clout created real joy.",
    category: "Food",
    location: "Rewari, Haryana",
    date: "Nov 12, 2025",
    amountUsed: 45000,
    livesImpacted: 47,
    ngo: "Seva Foundation",
    image:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format",
    beforeImage:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format",
    afterImage:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format",
    beneficiaryQuote:
      "Pehli baar itna acha khana khaya — Raju, 7 saal, Rewari",
    donors: ["Parveen Siwach", "Anonymous", "Tanishq Nyati"],
    likes: 234,
    dislikes: 2,
    comments: [
      {
        name: "Parveen Siwach",
        text: "So proud to be part of this! 🙏",
        time: "2 days ago",
      },
      {
        name: "Anonymous",
        text: "This is why I donate. Real impact.",
        time: "3 days ago",
      },
      {
        name: "Rahul M",
        text: "Raju ki smile dekh ke aankh bhar aayi 😢❤️",
        time: "3 days ago",
      },
    ],
    shares: 89,
  },
  {
    id: "2",
    title: "A Village Library Comes Alive 📚",
    description:
      "In a small village outside Muzaffarpur, Bihar, 60 children had no access to books. WeClout donors funded an entire library — 200 books, reading tables, and proper lighting. The village head called it the best day in the village's history. Education is the greatest gift.",
    category: "Education",
    location: "Muzaffarpur, Bihar",
    date: "Oct 28, 2025",
    amountUsed: 78000,
    livesImpacted: 60,
    ngo: "Padho India Foundation",
    image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format",
    beforeImage:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format",
    afterImage:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format",
    beneficiaryQuote: "Ab main doctor banungi — Priya, 10 saal, Muzaffarpur",
    donors: ["Bihar Donor", "Anonymous", "Parveen Siwach", "Tanishq Nyati"],
    likes: 412,
    dislikes: 1,
    comments: [
      {
        name: "Tanishq Nyati",
        text: "Bihar ke bacche deserve karte hain yeh sab 💪",
        time: "5 days ago",
      },
      {
        name: "Anonymous",
        text: "Priya ki baat sunke dil khush ho gaya",
        time: "6 days ago",
      },
    ],
    shares: 156,
  },
  {
    id: "3",
    title: "Medical Camp Reaches the Unreachable 🏥",
    description:
      "3 remote families in rural Pune had never seen a doctor in years. With WeClout funds, we organized a full day medical camp — checkups, medicines, and follow-up care for 3 families including 2 elderly members with chronic conditions. Health is wealth.",
    category: "Healthcare",
    location: "Pune, Maharashtra",
    date: "Oct 15, 2025",
    amountUsed: 32000,
    livesImpacted: 18,
    ngo: "HealthReach NGO",
    image:
      "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&auto=format",
    beforeImage:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format",
    afterImage:
      "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&auto=format",
    beneficiaryQuote: "20 saal baad doctor ne dekha mujhe — Rameshbai, 68, Pune",
    donors: ["Maharashtra Donor", "Anonymous", "Parveen Siwach"],
    likes: 567,
    dislikes: 0,
    comments: [
      {
        name: "Parveen Siwach",
        text: "Rameshbai ki baat sun ke rona aa gaya 🙏",
        time: "1 week ago",
      },
      {
        name: "Meera K",
        text: "This is what real clout looks like",
        time: "1 week ago",
      },
      {
        name: "Anonymous",
        text: "More medical camps please 🏥",
        time: "1 week ago",
      },
    ],
    shares: 203,
  },
  {
    id: "4",
    title: "Flood Relief Reaches Assam Families 🌧️",
    description:
      "When floods hit rural Assam, 25 families lost everything. WeClout donors from across India came together within 48 hours to fund emergency relief — food packets, clean water, blankets, and temporary shelter materials. In crisis, your clout saved lives.",
    category: "Disaster Relief",
    location: "Jorhat, Assam",
    date: "Sep 20, 2025",
    amountUsed: 125000,
    livesImpacted: 125,
    ngo: "Assam Relief Foundation",
    image:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format",
    beforeImage:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format",
    afterImage:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format",
    beneficiaryQuote: "Humne socha tha koi nahi aayega — Biren, 35, Jorhat",
    donors: [
      "Assam Donor",
      "Parveen Siwach",
      "Anonymous",
      "Tanishq Nyati",
      "Delhi Donor",
    ],
    likes: 891,
    dislikes: 3,
    comments: [
      {
        name: "Tanishq Nyati",
        text: "48 hours mein itna response — India zindabad 🇮🇳",
        time: "2 weeks ago",
      },
      {
        name: "Anonymous",
        text: "Biren ka quote padh ke goosebumps aa gaye",
        time: "2 weeks ago",
      },
      {
        name: "Priya S",
        text: "Proud to be a WeClout donor ❤️",
        time: "2 weeks ago",
      },
    ],
    shares: 445,
  },
  {
    id: "5",
    title: "1000 Winter Clothes for Delhi Streets 🧥",
    description:
      "Delhi winters are brutal for those without homes. This December, WeClout partnered with Goonj to distribute 1000 warm clothes — jackets, blankets, socks — to homeless individuals across Delhi. No one should shiver in the cold. Your clout kept them warm.",
    category: "Shelter",
    location: "New Delhi",
    date: "Dec 5, 2025",
    amountUsed: 95000,
    livesImpacted: 1000,
    ngo: "Goonj",
    image:
      "https://images.unsplash.com/photo-1531171673193-06ac8bc8fe36?w=800&auto=format",
    beforeImage:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format",
    afterImage:
      "https://images.unsplash.com/photo-1531171673193-06ac8bc8fe36?w=800&auto=format",
    beneficiaryQuote: "Pehli baar itni garmi mili is sardi mein — Munna, 45, Delhi",
    donors: ["Parveen Siwach", "Delhi Donor", "Anonymous", "Tanishq Nyati"],
    likes: 1203,
    dislikes: 5,
    comments: [
      {
        name: "Parveen Siwach",
        text: "Goonj ke saath kaam karna always special hota hai 🙏",
        time: "3 days ago",
      },
      {
        name: "Rahul M",
        text: "1000 lives warm — that is insane impact 🔥",
        time: "3 days ago",
      },
      {
        name: "Anonymous",
        text: "Munna bhai ka quote 😭❤️",
        time: "4 days ago",
      },
    ],
    shares: 678,
  },
];

const tickerMessages = [
  "⚡ 2 mins ago — ₹500 by Parveen helped feed 3 children in Rewari",
  "⚡ 15 mins ago — ₹1,000 by Anonymous funded school books in Bihar",
  "⚡ 1 hour ago — ₹2,500 by Tanishq provided winter clothes in Delhi",
  "⚡ 3 hours ago — ₹750 by Haryana Donor helped flood relief in Assam",
  "⚡ Today — ₹5,000 by Anonymous funded a medical camp in Pune",
];

const filters = [
  { label: "All", value: "All" },
  { label: "Food 🍱", value: "Food" },
  { label: "Education 📚", value: "Education" },
  { label: "Healthcare 🏥", value: "Healthcare" },
  { label: "Disaster Relief 🌧️", value: "Disaster Relief" },
  { label: "Shelter 🧥", value: "Shelter" },
];

const impactLevels = [
  { amount: 100, emoji: "🍱", text: "Feeds 1 child for 2 days" },
  { amount: 500, emoji: "🍱", text: "Feeds 5 children for 2 days" },
  { amount: 1000, emoji: "📚", text: "Buys school supplies for 3 kids" },
  {
    amount: 2000,
    emoji: "🏥",
    text: "Covers basic medical checkup for a family",
  },
  {
    amount: 5000,
    emoji: "🏠",
    text: "Provides shelter materials for flood victim",
  },
  {
    amount: 10000,
    emoji: "🎓",
    text: "Sponsors a child's education for 3 months",
  },
  {
    amount: 25000,
    emoji: "💧",
    text: "Funds a clean water project for a village",
  },
  {
    amount: 50000,
    emoji: "🏫",
    text: "Rebuilds a classroom in a rural school",
  },
];

function useCountUp(targets: number[]) {
  const [values, setValues] = useState(() => targets.map(() => 0));

  useEffect(() => {
    let frameId = 0;
    const duration = 1200;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setValues(targets.map((target) => Math.round(target * easedProgress)));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [targets]);

  return values;
}

function ImpactStatsBar() {
  const statTargets = useMemo(() => [845000, 2847, 12, 18], []);
  const statValues = useCountUp(statTargets);
  const stats = [
    { label: "Total Donated", value: formatAmount(statValues[0] ?? 0) },
    { label: "Lives Impacted", value: (statValues[1] ?? 0).toLocaleString("en-IN") },
    { label: "NGO Partners", value: String(statValues[2] ?? 0) },
    { label: "Cities Covered", value: String(statValues[3] ?? 0) },
  ];

  return (
    <section
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <div
          className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1f1f2e]"
          key={stat.label}
        >
          <p className="text-[22px] font-semibold tracking-tight text-[#f0f0f0]">
            {stat.value}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-[#444455]">
            {stat.label}
          </p>
        </div>
      ))}
    </section>
  );
}

function ImpactTicker() {
  const loopMessages = [...tickerMessages, ...tickerMessages];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0c040]/20 bg-[#0d0d1a] py-3">
      <div className="flex w-max animate-impact-ticker gap-8 whitespace-nowrap text-sm font-semibold text-[#f0c040]">
        {loopMessages.map((message, index) => (
          <span key={`${message}-${index}`}>{message}</span>
        ))}
      </div>
    </div>
  );
}

function ImpactCalculator() {
  const [amount, setAmount] = useState(1000);
  const impact = impactLevels.reduce(
    (current, level) => (amount >= level.amount ? level : current),
    impactLevels[0],
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1a1a24] p-5">
      <h2 className="text-2xl font-bold text-white">See Your Impact 💫</h2>
      <label className="mt-5 block text-sm font-semibold text-[#f0f0f0]/80">
        I donate ₹{amount.toLocaleString("en-IN")}
      </label>
      <input
        className="mt-3 w-full accent-[#f0c040]"
        max={50000}
        min={100}
        onChange={(event) => setAmount(Number(event.target.value))}
        step={100}
        type="range"
        value={amount}
      />
      <input
        className="mt-4 w-full rounded-lg border border-white/10 bg-[#111118] px-4 sm:px-6 py-3 text-white outline-none transition placeholder:text-[#444455] focus:border-[#f0c040]"
        min={100}
        onChange={(event) => setAmount(Number(event.target.value) || 100)}
        type="number"
        value={amount}
      />
      <div className="mt-5 rounded-2xl border border-[#f0c040]/40 bg-[#f0c040]/10 p-5 text-center">
        <p className="text-5xl">{impact.emoji}</p>
        <p className="mt-3 text-lg font-bold text-[#f0c040]">
          {impact.text}
        </p>
      </div>
    </section>
  );
}

function ImpactPostCard({ post }: { post: ImpactPost }) {
  const user = useAuthStore((store) => store.user);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments);

  async function handleShare() {
    const link = `${window.location.origin}/clout-for-good#impact-${post.id}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    } catch {
      toast.error("Unable to copy link.");
    }
  }

  function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    setComments((currentComments) => [
      {
        name: user?.name ?? user?.displayName ?? "WeClout User",
        text: commentText.trim(),
        time: "Just now",
      },
      ...currentComments,
    ]);
    setCommentText("");
  }

  const likes = post.likes + (isLiked ? 1 : 0);
  const dislikes = post.dislikes + (isDisliked ? 1 : 0);

  return (
    <article
      className="rounded-2xl border border-white/10 bg-[#1a1a24] p-4"
      id={`impact-${post.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0c040] text-sm font-black text-[#111118]">
            WC
          </div>
          <div>
            <p className="font-bold text-white">WeClout Impact</p>
            <p className="text-xs text-[#444455]">{post.date}</p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-[#f0c040]/30 px-3 py-1 text-xs font-semibold text-[#f0c040]">
          {post.location}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-2">
          <div className="relative">
            <img
              alt={`${post.title} before`}
              className="h-44 w-full object-cover"
              src={post.beforeImage}
            />
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              Before
            </span>
          </div>
          <div className="relative border-l-2 border-[#f0c040]">
            <img
              alt={`${post.title} after`}
              className="h-44 w-full object-cover"
              src={post.afterImage}
            />
            <span className="absolute right-3 top-3 rounded-full bg-[#f0c040] px-3 py-1 text-xs font-bold text-[#111118]">
              After
            </span>
          </div>
        </div>
      </div>

      <img
        alt={post.title}
        className="mt-4 max-h-80 w-full rounded-2xl object-cover"
        src={post.image}
      />

      <div className="mt-5 border-l-4 border-[#f0c040] bg-[#111118]/60 p-4">
        <p className="text-2xl">🗣️</p>
        <p className="mt-2 italic text-white">
          &ldquo;{post.beneficiaryQuote}&rdquo;
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          In partnership with {post.ngo}
        </span>
        <span className="text-[#888899]">
          {formatAmount(post.amountUsed)} of your donations used
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-[#f0c040]/20 bg-[#111118]/70 p-4">
        <p className="text-4xl font-black text-[#f0c040]">
          {post.livesImpacted.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-[#888899]">lives impacted</p>
      </div>

      <h3 className="mt-5 text-2xl font-bold text-white">{post.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#888899]">
        {isExpanded ? post.description : `${post.description.slice(0, 160)}...`}
      </p>
      <button
        className="mt-2 text-sm font-semibold text-[#f0c040]"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        {isExpanded ? "show less" : "read more"}
      </button>

      <div className="mt-5">
        <p className="text-sm font-semibold text-white">Made possible by:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {post.donors.map((donor) => (
            <span
              className="rounded-full bg-[#f0c040]/10 px-3 py-1 text-xs font-semibold text-[#f0c040]"
              key={donor}
            >
              {donor}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
        <button
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            isLiked
              ? "border-red-400/50 bg-red-500/15 text-red-300"
              : "border-white/10 text-[#f0f0f0]/80 hover:border-red-400/40"
          }`}
          onClick={() => {
            setIsLiked((current) => !current);
            setIsDisliked(false);
          }}
          type="button"
        >
          ❤️ {likes} Like
        </button>
        <button
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            isDisliked
              ? "border-gray-400/50 bg-gray-400/15 text-gray-200"
              : "border-white/10 text-[#f0f0f0]/80 hover:border-gray-400/40"
          }`}
          onClick={() => {
            setIsDisliked((current) => !current);
            setIsLiked(false);
          }}
          type="button"
        >
          👎 {dislikes}
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-[#f0f0f0]/80 transition hover:border-[#f0c040]/40"
          onClick={() => setShowComments((current) => !current)}
          type="button"
        >
          💬 {comments.length} Comments
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-[#f0f0f0]/80 transition hover:border-[#f0c040]/40"
          onClick={handleShare}
          type="button"
        >
          🔗 Share
        </button>
      </div>

      {showComments && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#111118]/70 p-4">
          {user ? (
            <form className="mb-4 flex gap-2" onSubmit={handleAddComment}>
              <input
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1a1a24] px-3 py-2 text-sm text-white outline-none focus:border-[#f0c040]"
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a comment..."
                value={commentText}
              />
              <button
                className="rounded-lg bg-[#f0c040] px-4 py-2 text-sm font-bold text-[#111118]"
                type="submit"
              >
                Send
              </button>
            </form>
          ) : (
            <p className="mb-4 text-sm text-[#444455]">
              Login to add a comment.
            </p>
          )}

          <div className="space-y-3">
            {comments.map((comment, index) => (
              <div key={`${comment.name}-${comment.time}-${index}`}>
                <p className="text-sm font-semibold text-[#f0c040]">
                  {comment.name}
                </p>
                <p className="mt-1 text-sm text-white">{comment.text}</p>
                <p className="mt-1 text-xs text-[#444455]">{comment.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function CloutForGoodPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const filteredPosts = impactPosts.filter(
    (post) => activeFilter === "All" || post.category === activeFilter,
  );

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 sm:px-6 pb-20 pt-14 text-white md:pb-8">
      <div className="page-enter relative mx-auto max-w-6xl">
        <div className="hero-glow" />
        <header className="relative z-10 py-8 text-left">
          <h1 className="text-[28px] font-semibold tracking-tight">
            <span className="text-[#f0f0f0]">Clout For </span>
            <span className="gold-shimmer">Good</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[13px] text-[#888899]">
            Every rupee you donate creates real change. Here&apos;s proof.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-[#f0c040]/30 bg-[#f0c040]/10 px-4 py-2 text-sm font-semibold text-[#f0c040]">
            ✅ 100% Transparent • Real Impact • Verified by WeClout
          </div>
        </header>

        <div className="mt-8">
          <ImpactStatsBar />
        </div>

        <div className="mt-6">
          <ImpactTicker />
        </div>

        <div className="mt-8">
          <ImpactCalculator />
        </div>

        <div className="mt-8">
          <ImpactMap />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? "bg-[#f0c040] text-[#111118]"
                  : "border border-white/10 bg-[#1a1a24] text-[#888899] hover:border-[#f0c040]/50 hover:text-white"
              }`}
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {filteredPosts.map((post) => (
            <ImpactPostCard key={post.id} post={post} />
          ))}
        </section>
      </div>
      </main>
    </PageTransition>
  );
}
