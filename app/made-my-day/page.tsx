"use client";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import MomentsMap from "@/components/MomentsMap";
import PageTransition from "@/components/PageTransition";
import { db } from "@/lib/firebase";
import { getRequests } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import type { MadeMyDayPost } from "@/types";

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

interface RazorpayCheckout {
  open: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

type LocalComment = {
  id: string;
  displayName: string;
  text: string;
  createdAt: string;
};

type LocalMadeMyDayPost = Omit<
  MadeMyDayPost,
  "comments" | "createdAt" | "likedBy" | "requestId" | "userId"
> & {
  comments: LocalComment[];
  userId?: string;
  requestId?: string;
};

type PendingRequest = {
  id: string;
  title?: string;
  category?: string;
  district?: string;
  state?: string;
  communityVotes?: number;
};

const dummyPosts: LocalMadeMyDayPost[] = [
  {
    id: "mmd1",
    displayName: "Sneha Sharma",
    isAnonymous: false,
    requestType: "Flash Mob 💃",
    title: "Mere boyfriend ne WeClout se mujhe propose kiya 😭💍",
    story:
      "Main apni saheli ke saath mall mein thi. Achanak music bajne laga aur 20 log nachne lage. Phir Arjun aaya ring lekar. Main toh bilkul ready nahi thi. Puri zindagi yaad rahega yeh din. WeClout team ne sab itna perfect kiya. Shukriya from the bottom of my heart 💕",
    rating: 5,
    emotionTags: ["😭 Cried", "🥰 Overwhelmed", "🤯 Mind Blown"],
    photoURL:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format",
    isSurpriseReveal: true,
    surpriseFrom: "Arjun Malhotra",
    likes: 1423,
    viralScore: 2891,
    weeklyVotes: 445,
    isWholesomeWinner: true,
    mapLocation: { state: "Delhi", district: "South Delhi" },
    weekNumber: "2026-W22",
    comments: [
      { id: "c1", displayName: "Priya K", text: "Yaar yeh dekh ke meri aankh bhar aayi 😢❤️", createdAt: "2 days ago" },
      { id: "c2", displayName: "Rahul M", text: "Arjun bhai ne toh level set kar diya 👑", createdAt: "2 days ago" },
      { id: "c3", displayName: "Anonymous", text: "Next mera number WeClout walo! 😂", createdAt: "3 days ago" },
    ],
  },
  {
    id: "mmd2",
    displayName: "Anonymous",
    isAnonymous: true,
    requestType: "Surprise 🎉",
    title: "Mere parents ki 25th anniversary par yeh hua 🥹",
    story:
      "Papa aur Mummy ki silver jubilee thi. Hum bachche unhe surprise dena chahte the lekin kuch plan nahi tha. WeClout ne ek poori evening organize ki — candle light dinner, unki favourite songs, purani photos ka slideshow. Papa ne pehli baar mujhe publicly hug kiya aur roya. Main kabhi nahi bhulunga yeh raat.",
    rating: 5,
    emotionTags: ["😭 Cried", "😱 Shocked", "🥰 Overwhelmed"],
    photoURL:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format",
    isSurpriseReveal: false,
    likes: 987,
    viralScore: 1876,
    weeklyVotes: 334,
    isWholesomeWinner: false,
    mapLocation: { state: "Punjab", district: "Ludhiana" },
    weekNumber: "2026-W22",
    comments: [
      { id: "c4", displayName: "Tanishq Nyati", text: "Papa ka pehli baar publicly rona 😭 yaar dil pighal gaya", createdAt: "3 days ago" },
      { id: "c5", displayName: "Parveen Siwach", text: "This is what WeClout is truly about ❤️", createdAt: "4 days ago" },
    ],
  },
  {
    id: "mmd3",
    displayName: "Vikram Nair",
    isAnonymous: false,
    requestType: "Prank 😂",
    title: "Mere dost ko laga uski job gayi — reality dekho 😂",
    story:
      "Mere best friend Rohan ko lagta tha woh bahut serious hai. Humne WeClout se ek epic prank karayi — fake HR call, fake termination letter, sab kuch. Uska face dekha jab pata chala yeh prank tha — PRICELESS. Phir hum sab ne surprise birthday party di usse. Best day ever!",
    rating: 5,
    emotionTags: ["🤯 Mind Blown", "😱 Shocked"],
    photoURL:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format",
    isSurpriseReveal: false,
    likes: 756,
    viralScore: 1543,
    weeklyVotes: 234,
    isWholesomeWinner: false,
    mapLocation: { state: "Karnataka", district: "Bengaluru Urban" },
    weekNumber: "2026-W22",
    comments: [
      { id: "c6", displayName: "Anonymous", text: "Rohan bhai ka face imagine kar ke hi has raha hoon 😂😂", createdAt: "1 day ago" },
      { id: "c7", displayName: "Meera S", text: "WeClout pranks section ka wait kar raha tha 🔥", createdAt: "2 days ago" },
    ],
  },
  {
    id: "mmd4",
    displayName: "Riya Gupta",
    isAnonymous: false,
    requestType: "Awareness 📢",
    title: "Mere gaon mein pehli baar awareness camp hua 🙏",
    story:
      "Main Delhi mein rehti hoon lekin mera gaon Rajasthan ke ek chhote se village mein hai. Maine WeClout se request ki ki wahan ek mental health awareness camp ho. Team ne poora arrange kiya — doctors, volunteers, pamphlets. 200 logon ne attend kiya. Pehli baar mere gaon mein is topic par baat hui openly.",
    rating: 5,
    emotionTags: ["🥰 Overwhelmed", "😭 Cried"],
    photoURL:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format",
    isSurpriseReveal: false,
    likes: 634,
    viralScore: 1289,
    weeklyVotes: 189,
    isWholesomeWinner: false,
    mapLocation: { state: "Rajasthan", district: "Barmer" },
    weekNumber: "2026-W22",
    comments: [
      { id: "c8", displayName: "Parveen Siwach", text: "Mental health awareness in rural India — this is HUGE 🙏", createdAt: "5 days ago" },
      { id: "c9", displayName: "Anonymous", text: "Riya you are doing God's work ❤️", createdAt: "5 days ago" },
    ],
  },
  {
    id: "mmd5",
    displayName: "Arjun Mehta",
    isAnonymous: false,
    requestType: "Surprise 🎉",
    title: "Meri behen ko nahi pata tha usne UPSC crack kiya 😱",
    story:
      "Meri behen Kavya ka UPSC result aane wala tha. Humne secretly WeClout se plan kiya — jab result aaya aur woh selected thi, achanak poora family surprise tha, balloons, cake, aur Mummy Papa ka recorded message jo woh Delhi mein nahi tha. Behen ki reaction? Pure shock phir pure joy. IAS officer ban gayi hamari Kavya!",
    rating: 5,
    emotionTags: ["😱 Shocked", "😭 Cried", "🥰 Overwhelmed", "🤯 Mind Blown"],
    photoURL:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format",
    isSurpriseReveal: true,
    surpriseFrom: "Arjun + Family",
    likes: 2341,
    viralScore: 4892,
    weeklyVotes: 891,
    isWholesomeWinner: false,
    mapLocation: { state: "Uttar Pradesh", district: "Lucknow" },
    weekNumber: "2026-W22",
    comments: [
      { id: "c10", displayName: "Tanishq Nyati", text: "UPSC + WeClout surprise = Legendary combo 🏆", createdAt: "1 day ago" },
      { id: "c11", displayName: "Parveen Siwach", text: "Kavya IAS — goosebumps aa gaye yaar 😭🙏", createdAt: "1 day ago" },
      { id: "c12", displayName: "Riya Gupta", text: "Meri aankh bhar aayi yeh padhke 😭❤️", createdAt: "2 days ago" },
      { id: "c13", displayName: "Anonymous", text: "WeClout ne toh Kavya ki zindagi ka sabse important din aur bhi khaas bana diya", createdAt: "2 days ago" },
    ],
  },
];

const tickerMessages = [
  "🔥 Rahul from Delhi just got a flash mob proposal!",
  "😱 Priya from Mumbai was surprised by her best friend!",
  "🎉 A Diwali surprise just happened in Jaipur!",
  "🥰 Someone's parents got a surprise anniversary party in Lucknow!",
];

const emotionOptions = ["😭 Cried", "🥰 Overwhelmed", "🤯 Mind Blown", "😱 Shocked", "😂 Laughed", "🙏 Grateful"];
const surpriseAmounts = [500, 1000, 2000, 5000];
const occasions = ["Birthday", "Anniversary", "Achievement", "Just Because"];

const fallbackRequests: PendingRequest[] = [
  { id: "fallback1", title: "Plan a surprise birthday for a teacher", category: "Surprise", district: "Rohtak", state: "Haryana", communityVotes: 64 },
  { id: "fallback2", title: "Flash mob for a cancer survivor", category: "Flash Mob", district: "Delhi", state: "Delhi", communityVotes: 48 },
  { id: "fallback3", title: "Village awareness camp for girls education", category: "Awareness", district: "Barmer", state: "Rajasthan", communityVotes: 32 },
];

const mapDots = [
  { left: "40%", top: "26%", color: "#f0c040", emoji: "💍", title: dummyPosts[0].title },
  { left: "32%", top: "40%", color: "#7c6af7", emoji: "🎉", title: dummyPosts[1].title },
  { left: "42%", top: "58%", color: "#38bdf8", emoji: "😂", title: dummyPosts[2].title },
  { left: "28%", top: "42%", color: "#22c55e", emoji: "📢", title: dummyPosts[3].title },
  { left: "46%", top: "34%", color: "#7c6af7", emoji: "🎉", title: dummyPosts[4].title },
];

function getInitial(displayName: string) {
  return displayName.replace("Anonymous", "A").charAt(0).toUpperCase();
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
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Ticker() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0c040]/20 bg-[#0d0d1a] py-3">
      <div className="flex w-max animate-impact-ticker gap-8 whitespace-nowrap text-sm font-semibold text-[#f0c040]">
        {[...tickerMessages, ...tickerMessages].map((message, index) => (
          <span key={`${message}-${index}`}>{message}</span>
        ))}
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    ["2,847", "Moments Created"],
    ["98%", "Happy Customers"],
    ["47", "Cities Reached"],
    ["23", "This Week: Fulfilled"],
  ];

  return (
    <section className="card-shine grid grid-cols-2 gap-3 rounded-2xl border border-white/[0.08] bg-[#1a1a24] px-4 py-3 lg:grid-cols-4">
      {stats.map(([value, label]) => (
        <div className="text-left" key={label}>
          <p className="text-[20px] font-semibold tracking-tight text-[#f0f0f0]">
            {value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-[#444455]">
            {label}
          </p>
        </div>
      ))}
    </section>
  );
}

function WholesomeSection({ post }: { post: LocalMadeMyDayPost }) {
  return (
    <section className="rounded-2xl border border-[#f0c040]/50 bg-[#f0c040]/10 p-5 shadow-[0_0_30px_rgba(240,192,64,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[#f0c040] px-3 py-1 text-sm font-black text-[#111118]">
          👑 Most Wholesome This Week
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[#f0f0f0]/80">
          Voting ends Sunday midnight
        </span>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
        <img alt={post.title} className="h-64 w-full rounded-2xl object-cover" src={post.photoURL} />
        <div>
          <p className="text-sm font-semibold text-[#f0c040]">{post.requestType}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{post.title}</h2>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#f0f0f0]/80">{post.story}</p>
          <button className="mt-5 rounded-lg bg-[#f0c040] px-4 py-3 font-bold text-[#111118]" type="button">
            Vote for this week&apos;s winner
          </button>
        </div>
      </div>
    </section>
  );
}

function ShareCardModal({ post, onClose }: { post: LocalMadeMyDayPost; onClose: () => void }) {
  async function handleCopyImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Unable to generate image.");
      return;
    }

    ctx.fillStyle = "#111118";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#f0c040";
    ctx.lineWidth = 10;
    ctx.strokeRect(25, 25, 850, 1050);
    ctx.fillStyle = "#f0c040";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("WeClout", 70, 105);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px sans-serif";
    wrapCanvasText(ctx, post.title, 70, 230, 760, 60);
    ctx.fillStyle = "#f0c040";
    ctx.font = "42px sans-serif";
    ctx.fillText("★★★★★", 70, 480);
    ctx.fillStyle = "#d1d5db";
    ctx.font = "32px sans-serif";
    ctx.fillText("This happened on WeClout", 70, 575);
    ctx.fillStyle = "#f0c040";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("weclout.app", 70, 1010);

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
      if (!blob || !navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard image unsupported.");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Share card copied!");
    } catch {
      await navigator.clipboard.writeText(`${post.title} — WeClout Made My Day`);
      toast.success("Share text copied!");
    }
  }

  const shareText = encodeURIComponent(`${post.title} — This happened on WeClout`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#f0c040]/30 bg-[#111118] p-5">
        <div className="rounded-2xl border border-[#f0c040]/40 bg-[#1a1a24] p-5 text-center">
          <p className="text-2xl font-black text-[#f0c040]">WeClout</p>
          <h3 className="mt-4 text-xl font-bold text-white">{post.title}</h3>
          <p className="mt-3 text-[#f0c040]">★★★★★</p>
          <p className="mt-3 text-sm text-[#f0f0f0]/80">This happened on WeClout</p>
          <p className="mt-8 text-xs text-[#f0c040]">weclout.app</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button className="rounded-lg bg-[#f0c040] px-3 py-2 text-sm font-bold text-[#111118]" onClick={handleCopyImage} type="button">
            Copy Image
          </button>
          <a className="rounded-lg border border-white/10 px-3 py-2 text-center text-sm text-white" href={`https://wa.me/?text=${shareText}`} rel="noreferrer" target="_blank">
            WhatsApp
          </a>
          <a className="rounded-lg border border-white/10 px-3 py-2 text-center text-sm text-white" href={`https://twitter.com/intent/tweet?text=${shareText}`} rel="noreferrer" target="_blank">
            Twitter
          </a>
        </div>
        <button className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-[#f0f0f0]/80" onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  );
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = `${word} `;
      currentY += lineHeight;
      return;
    }
    line = testLine;
  });
  ctx.fillText(line, x, currentY);
}

function MadeMyDayCard({ post }: { post: LocalMadeMyDayPost }) {
  const user = useAuthStore((store) => store.user);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [voted, setVoted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments);
  const [sharePost, setSharePost] = useState<LocalMadeMyDayPost | null>(null);

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentText.trim()) return;
    setComments((current) => [
      { id: `${Date.now()}`, displayName: user?.name ?? "WeClout User", text: commentText.trim(), createdAt: "Just now" },
      ...current,
    ]);
    setCommentText("");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/made-my-day#${post.id}`);
    toast.success("Link copied!");
  }

  return (
    <article
      className={`card-shine relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a24] transition-all duration-200 hover:border-white/[0.12] ${
        post.isWholesomeWinner
          ? "shadow-[0_0_30px_rgba(240,192,64,0.16)]"
          : ""
      }`}
      id={post.id}
    >
      {post.isWholesomeWinner && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-[#f0c040] via-pink-400 to-[#7c6af7] px-3 py-1 text-xs font-black text-[#111118]">
          👑 Winner
        </div>
      )}

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0c040] font-black text-[#111118]">
            {getInitial(post.displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{post.displayName}</p>
            <span className="mt-1 inline-flex rounded-full bg-[#111118] px-2 py-1 text-xs text-[#f0c040]">
              {post.requestType}
            </span>
          </div>
        </div>
        <div className="pr-16 text-right text-xs text-[#888899]">
          <p className="font-bold text-[#f0c040]">🔥 {post.viralScore}</p>
          <p>2 days ago</p>
        </div>
      </div>

      {post.isSurpriseReveal && (
        <div className="mx-4 mb-4 rounded-xl bg-[linear-gradient(90deg,#f0c040,#fff2a8,#f0c040)] bg-[length:200%_100%] px-4 py-3 font-bold text-[#111118] [animation:shine_1.4s_linear_infinite]">
          💌 Surprise from {post.surpriseFrom}!
        </div>
      )}

      <img alt={post.title} className="max-h-72 w-full object-cover" src={post.photoURL} />

      <div className="space-y-4 p-4">
        <h2 className="text-xl font-bold text-white">{post.title}</h2>
        <p className={`text-sm leading-6 text-[#f0f0f0]/80 ${expanded ? "" : "line-clamp-3"}`}>
          {post.story}
        </p>
        <button className="text-sm font-semibold text-[#f0c040]" onClick={() => setExpanded((current) => !current)} type="button">
          {expanded ? "Show less" : "Read more"}
        </button>

        <div className="flex flex-wrap gap-2">
          {post.emotionTags.map((tag) => (
            <span className="rounded-full bg-[#111118] px-3 py-1 text-xs text-gray-200 transition hover:-translate-y-1" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[#f0c040]">{"★".repeat(post.rating)}{"☆".repeat(5 - post.rating)}</p>
          <p className="text-sm text-[#444455]">📍 {post.mapLocation.district}, {post.mapLocation.state}</p>
          <span className="rounded-full bg-[#111118] px-3 py-1 text-sm font-bold text-[#f0c040]">
            🔥 Viral Score: {post.viralScore}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-5">
          <button className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${liked ? "scale-105 border-red-400 bg-red-500/20 text-red-300" : "border-white/10 text-[#f0f0f0]/80"}`} onClick={() => setLiked((current) => !current)} type="button">
            ❤️ {post.likes + (liked ? 1 : 0)}
          </button>
          <button className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${voted ? "border-[#f0c040] bg-[#f0c040]/20 text-[#f0c040]" : "border-white/10 text-[#f0f0f0]/80"}`} onClick={() => setVoted((current) => !current)} type="button">
            🗳️ {post.weeklyVotes + (voted ? 1 : 0)} Vote
          </button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-[#f0f0f0]/80" onClick={() => setShowComments((current) => !current)} type="button">
            💬 {comments.length}
          </button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-[#f0f0f0]/80" onClick={() => setSharePost(post)} type="button">
            📱 Share
          </button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-[#f0f0f0]/80" onClick={copyLink} type="button">
            🔗 Copy
          </button>
        </div>

        {showComments && (
          <div className="rounded-xl border border-white/10 bg-[#111118]/70 p-4">
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id}>
                  <p className="text-sm font-bold text-[#f0c040]">{comment.displayName}</p>
                  <p className="text-sm text-white">{comment.text}</p>
                  <p className="text-xs text-[#444455]">{comment.createdAt}</p>
                </div>
              ))}
            </div>
            {user && (
              <form className="mt-4 flex gap-2" onSubmit={addComment}>
                <input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1a1a24] px-3 py-2 text-sm text-white outline-none focus:border-[#f0c040]" onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment..." value={commentText} />
                <button className="rounded-lg bg-[#f0c040] px-4 py-2 text-sm font-bold text-[#111118]" type="submit">Send</button>
              </form>
            )}
          </div>
        )}
      </div>

      {sharePost && <ShareCardModal onClose={() => setSharePost(null)} post={sharePost} />}
    </article>
  );
}

function HappenedHereMap() {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-black text-white">📍 It Happened Here</h2>
      <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border border-[#f0c040]/20 bg-[#0d0d1a]">
        <div className="absolute left-[30%] top-[14%] h-[70%] w-[32%] rotate-6 rounded-[45%_55%_50%_50%] border border-[#f0c040]/15 bg-[#1a1a24]/70" />
        {mapDots.map((dot) => (
          <div className="group absolute" key={dot.title} style={{ left: dot.left, top: dot.top }}>
            <div className="h-4 w-4 animate-pulse rounded-full shadow-[0_0_18px_currentColor]" style={{ background: dot.color, color: dot.color }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 hidden w-56 -translate-x-1/2 rounded-lg border border-[#f0c040]/30 bg-[#1a1a24] px-3 py-2 text-xs text-white group-hover:block">
              <p className="font-bold text-[#f0c040]">{dot.emoji} {dot.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SurpriseModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((store) => store.user);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [description, setDescription] = useState("");
  const [reveal, setReveal] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("Fill surprise details first.");
      return;
    }
    if (!user?.uid) {
      toast.error("Login before sending a surprise.");
      return;
    }
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      toast.error("Payment gateway is not configured.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: "surprise" }),
      });
      if (!orderRes.ok) throw new Error("Unable to create payment order.");
      const order = (await orderRes.json()) as RazorpayOrder;
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Unable to load Razorpay.");

      let paid = false;
      const checkout = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "WeClout",
        description: `Surprise for ${name}`,
        order_id: order.id,
        prefill: { name: user.name, email: user.email ?? "" },
        theme: { color: "#f0c040" },
        modal: {
          ondismiss: () => {
            if (!paid) {
              setLoading(false);
              toast.error("Payment cancelled");
            }
          },
        },
        handler: async (response) => {
          paid = true;
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, userId: user.uid, amount }),
            });
            const verify = (await verifyRes.json()) as { verified?: boolean };
            if (!verifyRes.ok || !verify.verified) throw new Error("Payment verification failed.");
            await addDoc(collection(db, "surprise_requests"), {
              amount,
              createdAt: serverTimestamp(),
              description: description.trim(),
              isRevealAfterFulfilled: reveal,
              isSurprise: true,
              occasion,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              recipientName: name.trim(),
              status: "open",
              userId: user.uid,
            });
            toast.success("💌 Surprise request sent!");
            onClose();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save surprise.");
          } finally {
            setLoading(false);
          }
        },
      });
      checkout.open();
      setLoading(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open payment.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-5">
        <h2 className="text-2xl font-black text-white">💌 Surprise Someone</h2>
        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input className="w-full rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-white outline-none focus:border-[#f0c040]" onChange={(event) => setName(event.target.value)} placeholder="Who do you want to surprise?" value={name} />
          <select className="w-full rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-white outline-none focus:border-[#f0c040]" onChange={(event) => setOccasion(event.target.value)} value={occasion}>
            {occasions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <textarea className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-white outline-none focus:border-[#f0c040]" onChange={(event) => setDescription(event.target.value)} placeholder="Describe what you want us to do" value={description} />
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-sm text-[#f0f0f0]/80">
            Your name will be revealed after we fulfill it
            <input checked={reveal} onChange={(event) => setReveal(event.target.checked)} type="checkbox" />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {surpriseAmounts.map((option) => (
              <button className={`rounded-lg px-3 py-2 text-sm font-bold ${amount === option ? "bg-[#f0c040] text-[#111118]" : "border border-white/10 text-[#f0f0f0]/80"}`} key={option} onClick={() => setAmount(option)} type="button">
                ₹{option}
              </button>
            ))}
          </div>
          <button className="w-full rounded-lg bg-[#f0c040] px-4 py-3 font-black text-[#111118] disabled:opacity-60" disabled={loading} type="submit">
            {loading ? "Opening Payment..." : "Send Surprise 💌"}
          </button>
          <button className="w-full rounded-lg border border-white/10 px-4 py-3 text-[#f0f0f0]/80" onClick={onClose} type="button">Cancel</button>
        </form>
      </div>
    </div>
  );
}

function StoryModal({ onClose, onPost }: { onClose: () => void; onPost: (post: LocalMadeMyDayPost) => void }) {
  const user = useAuthStore((store) => store.user);
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [photoURL, setPhotoURL] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function readFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoURL(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !story.trim()) {
      toast.error("Add your title and story first.");
      return;
    }
    const displayName = anonymous ? "Anonymous" : user?.name ?? user?.displayName ?? "WeClout User";
    const newPost: LocalMadeMyDayPost = {
      id: `local-${Date.now()}`,
      displayName,
      emotionTags: tags.length > 0 ? tags : ["🥰 Overwhelmed"],
      isAnonymous: anonymous,
      isSurpriseReveal: false,
      isWholesomeWinner: false,
      likes: 0,
      mapLocation: { state: user?.state ?? "India", district: user?.district ?? "WeClout" },
      photoURL: photoURL || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format",
      rating,
      requestType: "Story 🌟",
      story: story.trim(),
      title: title.trim(),
      viralScore: 0,
      weekNumber: "2026-W22",
      weeklyVotes: 0,
      comments: [],
    };
    await addDoc(collection(db, "made_my_day"), {
      ...newPost,
      comments: [],
      createdAt: serverTimestamp(),
      likedBy: [],
      requestId: "",
      userId: user?.uid ?? "",
    });
    onPost(newPost);
    toast.success("🌟 Your story is live!");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111118] p-5">
        <h2 className="text-2xl font-black text-white">Your WeClout moment</h2>
        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input className="w-full rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-white outline-none focus:border-[#f0c040]" onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
          <textarea className="min-h-32 w-full resize-none rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-white outline-none focus:border-[#f0c040]" onChange={(event) => setStory(event.target.value)} placeholder="Tell us what happened..." value={story} />
          <div className="flex flex-wrap gap-2">
            {emotionOptions.map((tag) => (
              <button className={`rounded-full px-3 py-1 text-xs font-bold ${tags.includes(tag) ? "bg-[#f0c040] text-[#111118]" : "border border-white/10 text-[#f0f0f0]/80"}`} key={tag} onClick={() => toggleTag(tag)} type="button">
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-1 text-3xl text-[#f0c040]">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} type="button">{star <= rating ? "★" : "☆"}</button>
            ))}
          </div>
          <label
            className="block rounded-2xl border border-dashed border-[#f0c040]/40 bg-[#1a1a24] p-6 text-center text-sm text-[#f0f0f0]/80"
            onDragOver={(event: DragEvent<HTMLLabelElement>) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              readFile(event.dataTransfer.files[0]);
            }}
          >
            {photoURL ? "Photo ready ✓" : "Drag photo here or click to upload"}
            <input className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => readFile(event.target.files?.[0])} type="file" accept="image/*" />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1a1a24] px-4 py-3 text-sm text-[#f0f0f0]/80">
            Post anonymously
            <input checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} type="checkbox" />
          </label>
          <button className="w-full rounded-lg bg-[#f0c040] px-4 py-3 font-black text-[#111118]" type="submit">Share My Story ✨</button>
          <button className="w-full rounded-lg border border-white/10 px-4 py-3 text-[#f0f0f0]/80" onClick={onClose} type="button">Cancel</button>
        </form>
      </div>
    </div>
  );
}

function CommunityVoteSection() {
  const [requests, setRequests] = useState<PendingRequest[]>(fallbackRequests);
  const [votedId, setVotedId] = useState<string | null>(null);

  useEffect(() => {
    getRequests("all")
      .then((data) => {
        const openRequests = (data as PendingRequest[]).slice(0, 3);
        if (openRequests.length > 0) setRequests(openRequests);
      })
      .catch(() => undefined);
  }, []);

  async function vote(request: PendingRequest) {
    setVotedId(request.id);
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, communityVotes: (item.communityVotes ?? 0) + 1 } : item));
    if (!request.id.startsWith("fallback")) {
      await updateDoc(doc(db, "requests", request.id), { communityVotes: increment(1) });
    }
    toast.success("Vote counted!");
  }

  const maxVotes = Math.max(...requests.map((request) => request.communityVotes ?? 0), 1);
  const communityPickId = [...requests].sort((a, b) => (b.communityVotes ?? 0) - (a.communityVotes ?? 0))[0]?.id;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#1a1a24] p-5">
      <h2 className="text-2xl font-black text-white">🗳️ What Should WeClout Do Next?</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {requests.map((request) => {
          const votes = request.communityVotes ?? 0;
          return (
            <div className="rounded-2xl border border-white/10 bg-[#111118]/70 p-4" key={request.id}>
              {communityPickId === request.id && <span className="rounded-full bg-[#f0c040] px-2 py-1 text-xs font-black text-[#111118]">Community Pick</span>}
              <h3 className="mt-3 font-bold text-white">{request.title}</h3>
              <p className="mt-1 text-xs text-[#444455]">{request.district}, {request.state}</p>
              <div className="mt-4 h-2 rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-[#f0c040]" style={{ width: `${(votes / maxVotes) * 100}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-[#f0f0f0]/80">{votes} votes</span>
                <button className="rounded-lg bg-[#f0c040] px-3 py-2 text-sm font-bold text-[#111118] disabled:opacity-60" disabled={votedId === request.id} onClick={() => vote(request)} type="button">
                  Vote
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function MadeMyDayPage() {
  const [posts, setPosts] = useState(dummyPosts);
  const [showSurprise, setShowSurprise] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const topPost = posts.find((post) => post.isWholesomeWinner) ?? posts[0];

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 sm:px-6 pb-32 pt-14 text-white">
      {/* Firestore indexes: made_my_day weekNumber Ascending + viralScore Descending; made_my_day weekNumber Ascending + weeklyVotes Descending. */}
      <div className="page-enter relative mx-auto max-w-6xl">
        <div className="hero-glow" />
        <header className="relative z-10 py-8 text-left">
          <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">
            <span className="text-[#f0f0f0]">WeClout </span>
            <span className="gold-shimmer">Made My Day</span>
          </h1>
          <p className="mt-3 text-[13px] text-[#888899]">
            Real moments. Real people. Real magic.
          </p>
        </header>

        <div className="mt-8"><StatsBar /></div>
        <div className="mt-6"><Ticker /></div>
        <div className="mt-8"><MomentsMap /></div>
        <div className="mt-8"><WholesomeSection post={topPost} /></div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {posts.map((post) => <MadeMyDayCard key={post.id} post={post} />)}
        </section>

        <HappenedHereMap />
        <CommunityVoteSection />
      </div>

      <button className="fixed bottom-24 right-5 z-40 rounded-full border border-[#f0c040]/40 bg-[#1a1a24] px-5 py-3 font-black text-[#f0c040] shadow-xl" onClick={() => setShowSurprise(true)} type="button">
        💌 Surprise Someone
      </button>
      <button className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#f0c040] px-4 py-4 font-black text-[#111118] shadow-xl" onClick={() => setShowStory(true)} type="button">
        ✨ Share Your Story
      </button>

      {showSurprise && <SurpriseModal onClose={() => setShowSurprise(false)} />}
      {showStory && (
        <StoryModal
          onClose={() => setShowStory(false)}
          onPost={(post) => setPosts((current) => [post, ...current])}
        />
      )}
      </main>
    </PageTransition>
  );
}
