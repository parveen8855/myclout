"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Camera, Download, Loader2, Share2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import BadgesSection from "@/components/BadgesSection";
import PageTransition from "@/components/PageTransition";
import { getUserDoc, getUserDonations, updateUserDoc } from "@/lib/firestore";
import { db, storage } from "@/lib/firebase";
import { openRazorpay } from "@/lib/razorpay";
import { formatAmount, getCurrentWeek } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { BADGES, type TimelineItem, type UserUpgrades } from "@/types";

interface UserProfile {
  uid?: string;
  name?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  state?: string;
  district?: string;
  isAnonymous?: boolean;
  totalDonated?: number;
  currentWeekDonated?: number;
  streak?: number;
  streakFreezes?: number;
  badges?: string[];
  bestRank?: number;
  timeline?: TimelineItem[];
  upgrades?: UserUpgrades;
}

interface DonationHistoryItem {
  id: string;
  amount?: number;
  createdAt?:
    | Date
    | {
        toDate?: () => Date;
      };
  week?: string;
}

type BadgeInfo = (typeof BADGES)[keyof typeof BADGES];

const CLOUT_LEVELS = [
  {
    name: "Stone",
    emoji: "🪨",
    threshold: 0,
    color: "#8a8a99",
  },
  {
    name: "Bronze",
    emoji: "🥉",
    threshold: 1000,
    color: "#f59e0b",
  },
  {
    name: "Silver",
    emoji: "🥈",
    threshold: 10000,
    color: "#d1d5db",
  },
  {
    name: "Gold",
    emoji: "🥇",
    threshold: 50000,
    color: "#facc15",
  },
  {
    name: "Diamond",
    emoji: "💎",
    threshold: 100000,
    color: "#22d3ee",
  },
  {
    name: "Sovereign",
    emoji: "👑",
    threshold: 500000,
    color: "#a855f7",
  },
] as const;

const STREAK_FREEZE_OPTIONS = [
  { freezes: 1, label: "1 Freeze", price: 49, save: "" },
  { freezes: 3, label: "3 Freezes", price: 99, save: "save ₹48" },
  { freezes: 5, label: "5 Freezes", price: 149, save: "save ₹96" },
] as const;

const BADGE_COLOR_OPTIONS = [
  { label: "Gold", value: "#f0c040" },
  { label: "Purple", value: "#7c6af7" },
  { label: "Red", value: "#ef4444" },
  { label: "Cyan", value: "#22d3ee" },
  { label: "Green", value: "#22c55e" },
  { label: "Pink", value: "#ec4899" },
] as const;

const PROFILE_UPGRADES = [
  {
    description:
      "A glowing animated border around your profile photo everywhere on WeClout",
    id: "animatedBorder",
    price: 199,
    title: "Animated Border",
  },
  {
    description:
      "Your name appears bold and slightly larger on all leaderboards permanently",
    id: "boldName",
    price: 299,
    title: "Bold Name on Leaderboard",
  },
  {
    description: "Choose any color for your stage badge (Bronze, Gold etc)",
    id: "badgeColor",
    price: 399,
    title: "Custom Badge Color",
  },
  {
    description: "All 3 upgrades above at one price",
    id: "fullPackage",
    price: 499,
    title: "Full Flex Package",
  },
] as const;

type StreakFreezeOption = (typeof STREAK_FREEZE_OPTIONS)[number];

function getCloutProgress(totalDonated = 0) {
  const currentIndex = CLOUT_LEVELS.reduce((activeIndex, level, index) => {
    return totalDonated >= level.threshold ? index : activeIndex;
  }, 0);
  const current = CLOUT_LEVELS[currentIndex];
  const next = CLOUT_LEVELS[currentIndex + 1];
  const progressPercent = next
    ? Math.min(
        100,
        Math.max(
          0,
          ((totalDonated - current.threshold) /
            (next.threshold - current.threshold)) *
            100,
        ),
      )
    : 100;

  return {
    amountNeeded: Math.max(0, (next?.threshold ?? totalDonated) - totalDonated),
    current,
    next,
    progressPercent,
  };
}

function getBadgeDetails(id: string) {
  return Object.values(BADGES).find((badge) => badge.id === id);
}

function formatDonationDate(createdAt?: DonationHistoryItem["createdAt"]) {
  const date =
    createdAt instanceof Date ? createdAt : createdAt?.toDate?.();

  if (!date) {
    return "Recent";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimelineDate(dateValue?: TimelineItem["date"]) {
  const date =
    dateValue instanceof Date
      ? dateValue
      : typeof dateValue === "string"
        ? new Date(dateValue)
        : dateValue?.toDate?.();

  if (!date || Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getAuraClass(levelName: string) {
  if (levelName === "Stone") {
    return "";
  }

  return `profile-aura-${levelName.toLowerCase()}`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not generate card image."));
    }, "image/png");
  });
}

function loadCanvasImage(src?: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function createCloutCardCanvas({
  badges,
  displayName,
  level,
  location,
  photoURL,
  streak,
  totalDonated,
}: {
  badges: BadgeInfo[];
  displayName: string;
  level: (typeof CLOUT_LEVELS)[number];
  location: string;
  photoURL?: string;
  streak: number;
  totalDonated: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable.");
  }

  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(840, 140, 0, 840, 140, 520);
  gradient.addColorStop(0, "rgba(240,192,64,0.18)");
  gradient.addColorStop(0.45, "rgba(124,106,247,0.1)");
  gradient.addColorStop(1, "rgba(15,15,26,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#f0c040";
  ctx.lineWidth = 5;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.font = "700 34px Inter, Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("We", 72, 90);
  ctx.fillStyle = "#f0c040";
  ctx.fillText("Clout", 118, 90);

  const image = await loadCanvasImage(photoURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(190, 302, 94, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    ctx.drawImage(image, 96, 208, 188, 188);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(96, 208, 188, 188);
    ctx.fillStyle = "#f0c040";
    ctx.font = "700 78px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(displayName.charAt(0).toUpperCase(), 190, 302);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(240,192,64,0.75)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(190, 302, 96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 58px Inter, Arial, sans-serif";
  ctx.fillText(displayName, 330, 258);

  ctx.fillStyle = "#8f8fa3";
  ctx.font = "400 24px Inter, Arial, sans-serif";
  ctx.fillText(location || "Location not set", 332, 302);

  ctx.fillStyle = "rgba(240,192,64,0.12)";
  ctx.strokeStyle = "rgba(240,192,64,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(330, 332, 190, 46, 23);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f0c040";
  ctx.font = "600 22px Inter, Arial, sans-serif";
  ctx.fillText(`${level.emoji} ${level.name}`, 354, 363);

  ctx.fillStyle = "#f0c040";
  ctx.font = "700 48px Inter, Arial, sans-serif";
  ctx.fillText(formatAmount(totalDonated), 330, 470);
  ctx.fillStyle = "#77778a";
  ctx.font = "500 20px Inter, Arial, sans-serif";
  ctx.fillText("total donated", 332, 505);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px Inter, Arial, sans-serif";
  ctx.fillText(`${streak} 🔥`, 640, 470);
  ctx.fillStyle = "#77778a";
  ctx.font = "500 20px Inter, Arial, sans-serif";
  ctx.fillText("week streak", 642, 505);

  ctx.fillStyle = "#77778a";
  ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.fillText("TOP BADGES", 330, 570);

  badges.slice(0, 3).forEach((badge, index) => {
    const x = 330 + index * 150;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(x, 590, 118, 46, 16);
    ctx.fill();
    ctx.font = "24px Inter, Arial, sans-serif";
    ctx.fillText(badge.emoji, x + 18, 621);
    ctx.fillStyle = "#f0c040";
    ctx.font = "600 16px Inter, Arial, sans-serif";
    ctx.fillText(badge.name.split(" ")[0], x + 52, 620);
  });

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.fillText("weclout.com", 1008, 620);

  return canvas;
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [donations, setDonations] = useState<DonationHistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isCloutCardOpen, setIsCloutCardOpen] = useState(false);
  const [isCardWorking, setIsCardWorking] = useState(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentWorking, setIsPaymentWorking] = useState(false);
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedFreezeOption, setSelectedFreezeOption] = useState<StreakFreezeOption>(
    STREAK_FREEZE_OPTIONS[0],
  );
  const [selectedBadgeColor, setSelectedBadgeColor] = useState("#f0c040");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) {
        return;
      }

      try {
        const userDoc = (await getUserDoc(user.uid)) as UserProfile | null;
        const loadedProfile = {
          ...user,
          ...(userDoc ?? {}),
        };

        setProfile(loadedProfile);
        setName(loadedProfile.name ?? loadedProfile.displayName ?? "");
        setIsAnonymous(Boolean(loadedProfile.isAnonymous));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load profile.",
        );
      }
    }

    loadProfile();
  }, [user]);

  useEffect(() => {
    async function loadDonations() {
      if (!user?.uid) {
        return;
      }

      try {
        const userDonations = (await getUserDonations(
          user.uid,
        )) as DonationHistoryItem[];

        console.log("Donations:", userDonations);
        setDonations(userDonations);
      } catch (error) {
        console.log("Donation history fetch error:", error);
        setDonations([]);
      }
    }

    loadDonations();
  }, [user?.uid]);

  useEffect(() => {
    if (profile?.upgrades?.badgeColor) {
      setSelectedBadgeColor(profile.upgrades.badgeColor);
    }
  }, [profile?.upgrades?.badgeColor]);

  const displayName = profile?.name ?? profile?.displayName ?? "WeClouter";
  const totalDonated = profile?.totalDonated ?? 0;
  const streak = profile?.streak ?? 0;
  const streakFreezes = profile?.streakFreezes ?? 0;
  const upgrades = profile?.upgrades ?? {};
  const locationText =
    [profile?.state, profile?.district].filter(Boolean).join(" • ") ||
    "Location not set";
  const cloutProgress = useMemo(
    () => getCloutProgress(totalDonated),
    [totalDonated],
  );
  const stageBadgeColor = upgrades.badgeColor ?? cloutProgress.current.color;
  const earnedBadges = useMemo(
    () =>
      (profile?.badges ?? [])
        .map(getBadgeDetails)
        .filter((badge): badge is BadgeInfo => Boolean(badge)),
    [profile?.badges],
  );
  const timelineItems = useMemo(
    () => [...(profile?.timeline ?? [])].sort((a, b) => {
      const dateA =
        a.date instanceof Date
          ? a.date
          : typeof a.date === "string"
            ? new Date(a.date)
            : a.date?.toDate?.();
      const dateB =
        b.date instanceof Date
          ? b.date
          : typeof b.date === "string"
            ? new Date(b.date)
            : b.date?.toDate?.();

      return (dateB?.getTime() ?? 0) - (dateA?.getTime() ?? 0);
    }),
    [profile?.timeline],
  );
  const auraClassName = getAuraClass(cloutProgress.current.name);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.uid) {
      return;
    }

    setIsSaving(true);

    try {
      const newName = name;
      const newAnonymous = isAnonymous;
      const publicDisplayName = newAnonymous ? "👻 Anonymous" : newName;

      await updateUserDoc(user.uid, {
        isAnonymous: newAnonymous,
        name: newName,
      });

      const weekDocId = `${getCurrentWeek()}_${user.uid}`;
      await setDoc(
        doc(db, "leaderboard_weekly", weekDocId),
        {
          displayName: publicDisplayName,
          isAnonymous: newAnonymous,
        },
        { merge: true },
      );

      const donationsQuery = query(
        collection(db, "donations"),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(donationsQuery);
      const updatePromises = snapshot.docs.map((donationDoc) =>
        updateDoc(donationDoc.ref, { displayName: publicDisplayName }),
      );
      await Promise.all(updatePromises);

      const nextProfile = {
        ...(profile ?? {}),
        isAnonymous: newAnonymous,
        name: newName,
      };
      const updatedUser = {
        ...user,
        isAnonymous: newAnonymous,
        name: newName,
      };

      setProfile(nextProfile);
      setUser(updatedUser);
      await refreshUser(user.uid);
      setIsEditing(false);
      toast.success("✅ Profile updated everywhere!");

      if (newAnonymous) {
        toast.success("👻 You are now anonymous on all leaderboards");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !user?.uid) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      event.target.value = "";
      return;
    }

    setIsPhotoUploading(true);

    try {
      const profileImageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(profileImageRef, file, {
        contentType: file.type,
      });
      const photoURL = await getDownloadURL(profileImageRef);

      await updateUserDoc(user.uid, { photoURL });
      setProfile((current) => ({ ...(current ?? {}), photoURL }));
      setUser({ ...user, photoURL });
      await refreshUser(user.uid);
      toast.success("Profile photo updated!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update profile photo.",
      );
    } finally {
      setIsPhotoUploading(false);
      event.target.value = "";
    }
  }

  async function buildCurrentCloutCard() {
    return createCloutCardCanvas({
      badges: earnedBadges,
      displayName,
      level: cloutProgress.current,
      location: locationText,
      photoURL: profile?.photoURL,
      streak,
      totalDonated,
    });
  }

  async function handleDownloadCloutCard() {
    setIsCardWorking(true);

    try {
      const canvas = await buildCurrentCloutCard();
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "weclout-clout-card.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Clout card downloaded!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to download card.",
      );
    } finally {
      setIsCardWorking(false);
    }
  }

  async function handleShareCloutCard() {
    setIsCardWorking(true);

    try {
      const canvas = await buildCurrentCloutCard();
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], "weclout-clout-card.png", {
        type: "image/png",
      });
      const sharePayload = {
        files: [file],
        text: "My WeClout clout card",
        title: "WeClout Clout Card",
      };

      if (
        navigator.share &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(sharePayload)
      ) {
        await navigator.share(sharePayload);
        return;
      }

      await navigator.clipboard.writeText(`${window.location.origin}/profile`);
      toast.success("Profile link copied!");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      toast.error("Unable to share card.");
    } finally {
      setIsCardWorking(false);
    }
  }

  async function startPaidProfileFeature({
    amount,
    description,
    onPaid,
    receiptPrefix,
  }: {
    amount: number;
    description: string;
    onPaid: () => Promise<void>;
    receiptPrefix: string;
  }) {
    if (!user?.uid) {
      toast.error("Please log in first.");
      return;
    }

    setIsPaymentWorking(true);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `${receiptPrefix}_${Date.now()}`,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to create payment order.");
      }

      const order = (await orderResponse.json()) as {
        amount?: number;
        currency?: string;
        id?: string;
        orderId?: string;
      };
      const orderId = order.orderId ?? order.id;

      if (!orderId) {
        throw new Error("Payment order id missing.");
      }

      await openRazorpay({
        amount,
        description,
        name: "WeClout",
        onDismiss: () => setIsPaymentWorking(false),
        onSuccess: async (_paymentId, response) => {
          const verifyResponse = await fetch("/api/verify-payment", {
            body: JSON.stringify({
              amount,
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

          if (!verification.verified) {
            throw new Error("Payment verification failed.");
          }

          await onPaid();
          await refreshUser(user.uid);
          setIsPaymentWorking(false);
        },
        orderId,
        prefill: {
          email: profile?.email ?? user.email ?? "",
          name: displayName,
        },
      });
    } catch (error) {
      setIsPaymentWorking(false);
      toast.error(error instanceof Error ? error.message : "Payment failed.");
    }
  }

  async function handleBuyStreakFreeze() {
    await startPaidProfileFeature({
      amount: selectedFreezeOption.price,
      description: `Streak Freeze - ${selectedFreezeOption.label}`,
      onPaid: async () => {
        await updateUserDoc(user.uid, {
          streakFreezes: increment(selectedFreezeOption.freezes),
          timeline: arrayUnion({
            date: new Date(),
            description: `${selectedFreezeOption.label} added to protect your streak.`,
            icon: "🧊",
            milestone: true,
            title: "Bought Streak Freeze",
          }),
        });
        setProfile((current) => ({
          ...(current ?? {}),
          streakFreezes:
            (current?.streakFreezes ?? streakFreezes) +
            selectedFreezeOption.freezes,
        }));
        setIsFreezeModalOpen(false);
        toast.success("🧊 Streak Freeze added! Your streak is protected.");
      },
      receiptPrefix: "weclout_freeze",
    });
  }

  async function handleBuyProfileUpgrade(
    upgradeId: (typeof PROFILE_UPGRADES)[number]["id"],
  ) {
    const upgrade = PROFILE_UPGRADES.find((item) => item.id === upgradeId);

    if (!upgrade) {
      return;
    }

    await startPaidProfileFeature({
      amount: upgrade.price,
      description: `Profile Upgrade - ${upgrade.title}`,
      onPaid: async () => {
        const updatePayload =
          upgradeId === "animatedBorder"
            ? { "upgrades.animatedBorder": true }
            : upgradeId === "boldName"
              ? { "upgrades.boldName": true }
              : upgradeId === "badgeColor"
                ? { "upgrades.badgeColor": selectedBadgeColor }
                : {
                    "upgrades.animatedBorder": true,
                    "upgrades.badgeColor": selectedBadgeColor,
                    "upgrades.boldName": true,
                  };

        await updateUserDoc(user.uid, updatePayload);
        setProfile((current) => ({
          ...(current ?? {}),
          upgrades: {
            ...(current?.upgrades ?? upgrades),
            ...(upgradeId === "animatedBorder"
              ? { animatedBorder: true }
              : upgradeId === "boldName"
                ? { boldName: true }
                : upgradeId === "badgeColor"
                  ? { badgeColor: selectedBadgeColor }
                  : {
                      animatedBorder: true,
                      badgeColor: selectedBadgeColor,
                      boldName: true,
                    }),
          },
        }));
        setIsUpgradeModalOpen(false);
        toast.success("✨ Profile upgraded!");
      },
      receiptPrefix: "weclout_upgrade",
    });
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <div className="page-enter relative mx-auto max-w-5xl">
          <div className="hero-glow" />
          <section className="card-shine relative z-10 mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:mt-8 sm:p-6">
            {auraClassName && (
              <div
                aria-hidden="true"
                className={`profile-aura ${auraClassName}`}
              >
                {(cloutProgress.current.name === "Gold" ||
                  cloutProgress.current.name === "Sovereign") &&
                  Array.from({ length: 14 }).map((_, index) => (
                    <span
                      className="profile-particle"
                      key={index}
                      style={{
                        animationDelay: `${index * 0.35}s`,
                        left: `${8 + ((index * 13) % 86)}%`,
                      }}
                    />
                  ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
                <div className="relative h-28 w-28 shrink-0">
                  <div
                    className={`h-28 w-28 overflow-hidden rounded-full bg-[#7c6af7]/20 bg-cover bg-center ring-2 ring-[#f0c040]/20 shadow-[0_0_40px_rgba(240,192,64,0.1)] ${
                      upgrades.animatedBorder ? "animated-profile-border" : ""
                    }`}
                    style={{
                      backgroundImage: profile?.photoURL
                        ? `url(${profile.photoURL})`
                        : undefined,
                    }}
                  >
                    {!profile?.photoURL && (
                      <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#f0c040]">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {isPhotoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                      <Loader2 className="h-6 w-6 animate-spin text-[#f0c040]" />
                    </div>
                  )}

                  <button
                    aria-label="Update profile photo"
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#f0c040]/40 bg-[#0f0f1a] text-[#f0c040] shadow-lg transition hover:bg-[#1a1500]"
                    disabled={isPhotoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelected}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>

                <div className="w-full max-w-xl">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    {displayName}
                  </h1>
                  <p className="mt-2 text-sm text-[#888899]">
                    {locationText}
                  </p>
                  <div
                    className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold"
                    style={{
                      backgroundColor: `${stageBadgeColor}18`,
                      borderColor: `${stageBadgeColor}40`,
                      color: stageBadgeColor,
                    }}
                  >
                    <span>{cloutProgress.current.emoji}</span>
                    <span>{cloutProgress.current.name}</span>
                  </div>

                  <div className="mt-4 max-w-md">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-[#888899]">
                      <span>{cloutProgress.current.name}</span>
                      <span>{cloutProgress.next?.name ?? "Max Level"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          backgroundColor: cloutProgress.current.color,
                          boxShadow: `0 0 18px ${cloutProgress.current.color}66`,
                          width: `${cloutProgress.progressPercent}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#888899]">
                      {cloutProgress.next
                        ? `${formatAmount(cloutProgress.amountNeeded)} more to reach ${cloutProgress.next.name}`
                        : "You have reached Sovereign status."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-auto">
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  <button
                    className="min-h-11 w-full rounded-xl bg-[#f0c040] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#ffe680]"
                    onClick={() => setIsEditing((current) => !current)}
                    type="button"
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </button>
                  <button
                    className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:border-[#f0c040]/35 hover:text-[#f0c040]"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    type="button"
                  >
                    ✨ Upgrade Profile
                  </button>
                </div>

                {(upgrades.animatedBorder ||
                  upgrades.boldName ||
                  upgrades.badgeColor) && (
                  <div className="flex flex-wrap gap-2 md:max-w-48">
                    {upgrades.animatedBorder && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        ✨ Animated Border
                      </span>
                    )}
                    {upgrades.boldName && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        💪 Bold Name
                      </span>
                    )}
                    {upgrades.badgeColor && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        🎨 Custom Color
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="min-h-11 rounded-xl border border-[#f0c040]/25 bg-[#f0c040]/10 px-5 py-2.5 text-[13px] font-semibold text-[#f0c040] transition hover:border-[#f0c040]/50 hover:bg-[#f0c040]/15"
                onClick={() => setIsCloutCardOpen(true)}
                type="button"
              >
                Share My Clout Card
              </button>
            </div>

            {isEditing && (
              <form
                className="relative z-10 mt-6 grid gap-4 md:grid-cols-[1fr_auto]"
                onSubmit={handleSaveProfile}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#f0f0f0]/80">
                    Name
                  </span>
                  <input
                    className="w-full rounded-lg border border-white/[0.08] bg-[#16161f] px-4 py-3 text-white outline-none transition placeholder:text-[#444455] focus:border-[#f0c040]"
                    onChange={(event) => setName(event.target.value)}
                    required
                    type="text"
                    value={name}
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                  <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#16161f] px-4 py-3 text-sm text-[#888899]">
                    <input
                      checked={isAnonymous}
                      onChange={(event) =>
                        setIsAnonymous(event.target.checked)
                      }
                      type="checkbox"
                    />
                    Anonymous
                  </label>
                  <button
                    className="min-h-11 rounded-xl bg-[#f0c040] px-5 py-2.5 text-[13px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving}
                    type="submit"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5">
              <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                Total Donated
              </p>
              <p className="mt-3 text-[22px] font-semibold text-[#f0f0f0]">
                {formatAmount(totalDonated)}
              </p>
            </div>
            <div className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5">
              <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                Current Streak
              </p>
              <p className="mt-3 text-[22px] font-semibold text-[#f0f0f0]">
                {streak} 🔥
              </p>
              <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                <p className="text-xs font-medium text-cyan-200">
                  🧊 {streakFreezes} Freeze(s) available
                </p>
                {streakFreezes > 0 && (
                  <p className="mt-1 text-[11px] text-[#888899]">
                    Freeze will auto-apply if you miss a week
                  </p>
                )}
                <button
                  className="mt-3 min-h-11 w-full rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                  onClick={() => setIsFreezeModalOpen(true)}
                  type="button"
                >
                  Buy Streak Freeze
                </button>
              </div>
            </div>
            <div className="card-shine rounded-[14px] border border-white/[0.08] bg-[#1a1a24] p-5">
              <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                Best Rank Ever
              </p>
              <p className="mt-3 text-[22px] font-semibold text-[#f0f0f0]">
                {profile?.bestRank ? `#${profile.bestRank}` : "—"}
              </p>
            </div>
          </section>

          <div className="mt-6">
            <BadgesSection user={profile} />
          </div>

          <section className="card-shine mt-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
            <h2 className="text-xl font-bold text-white">
              Your WeClout Journey
            </h2>
            {timelineItems.length === 0 ? (
              <p className="mt-5 rounded-xl border border-white/[0.08] bg-[#16161f] p-4 text-sm italic text-[#888899]">
                Your journey is just beginning...
              </p>
            ) : (
              <div className="mt-6 space-y-0">
                {timelineItems.map((item, index) => (
                  <div className="relative flex gap-4 pb-5" key={`${item.title}-${index}`}>
                    {index < timelineItems.length - 1 && (
                      <span className="absolute left-[17px] top-9 h-full w-px bg-white/[0.08]" />
                    )}
                    <div
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${
                        item.milestone
                          ? "border-[#f0c040]/40 bg-[#f0c040]/10 text-[#f0c040]"
                          : "border-white/[0.08] bg-[#16161f] text-white"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#16161f] p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-semibold text-white">
                          {item.title}
                        </h3>
                        <span className="text-xs text-[#444455]">
                          {formatTimelineDate(item.date)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#888899]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-shine mt-6 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
            <h2 className="text-xl font-bold text-white">Donation History</h2>
            {donations.length === 0 ? (
              <p className="mt-5 rounded-xl border border-white/[0.08] bg-[#16161f] p-4 text-sm text-[#888899]">
                No donations yet
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {donations.map((donation) => (
                  <div
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#16161f] p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={donation.id}
                  >
                    <div>
                      <p className="text-sm text-white">
                        {formatDonationDate(donation.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-[#444455]">
                        {donation.week ?? "Week unknown"}
                      </p>
                    </div>
                    <p className="font-bold text-[#f0c040]">
                      ₹{(donation.amount ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {isFreezeModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    🧊 Protect Your Streak
                  </h2>
                  <p className="mt-2 text-sm text-[#888899]">
                    Buy freezes now. They auto-apply when you miss a week.
                  </p>
                </div>
                <button
                  aria-label="Close streak freeze modal"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[#888899] transition hover:text-white"
                  onClick={() => setIsFreezeModalOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {STREAK_FREEZE_OPTIONS.map((option) => (
                  <label
                    className={`flex min-h-14 cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                      selectedFreezeOption.freezes === option.freezes
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/[0.08] bg-[#1a1a24] hover:border-white/20"
                    }`}
                    key={option.freezes}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        checked={selectedFreezeOption.freezes === option.freezes}
                        onChange={() => setSelectedFreezeOption(option)}
                        type="radio"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          {option.label}
                        </span>
                        {option.save && (
                          <span className="text-xs text-emerald-300">
                            {option.save}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-[#f0c040]">
                      ₹{option.price}
                    </span>
                  </label>
                ))}
              </div>

              <button
                className="mt-5 min-h-11 w-full rounded-xl bg-[#f0c040] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPaymentWorking}
                onClick={handleBuyStreakFreeze}
                type="button"
              >
                {isPaymentWorking ? "Opening Payment..." : "Buy Now"}
              </button>
            </div>
          </div>
        )}

        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                    Monetize Your Aura
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    WeClout Profile Upgrades
                  </h2>
                </div>
                <button
                  aria-label="Close profile upgrades modal"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[#888899] transition hover:text-white"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {PROFILE_UPGRADES.map((upgrade) => {
                  const isFullPackage = upgrade.id === "fullPackage";

                  return (
                    <div
                      className={`relative rounded-2xl border bg-[#1a1a24] p-4 ${
                        isFullPackage
                          ? "border-[#f0c040]/35"
                          : "border-white/[0.08]"
                      }`}
                      key={upgrade.id}
                    >
                      {isFullPackage && (
                        <span className="absolute right-4 top-4 rounded-full bg-[#f0c040] px-2.5 py-1 text-[10px] font-black text-black">
                          BEST VALUE
                        </span>
                      )}
                      <div className="mb-4 flex items-center gap-3">
                        {upgrade.id === "animatedBorder" ? (
                          <div className="animated-profile-border flex h-12 w-12 items-center justify-center rounded-full bg-[#111118] text-[#f0c040]">
                            ✨
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-lg">
                            {upgrade.id === "boldName"
                              ? "💪"
                              : upgrade.id === "badgeColor"
                                ? "🎨"
                                : "👑"}
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {upgrade.title}
                          </h3>
                          <p className="text-sm font-bold text-[#f0c040]">
                            ₹{upgrade.price}
                          </p>
                        </div>
                      </div>
                      <p className="min-h-12 text-sm text-[#888899]">
                        {upgrade.description}
                      </p>

                      {(upgrade.id === "badgeColor" ||
                        upgrade.id === "fullPackage") && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {BADGE_COLOR_OPTIONS.map((color) => (
                            <button
                              aria-label={`Choose ${color.label}`}
                              className={`h-8 w-8 rounded-full border-2 transition ${
                                selectedBadgeColor === color.value
                                  ? "border-white scale-110"
                                  : "border-transparent"
                              }`}
                              key={color.value}
                              onClick={() => setSelectedBadgeColor(color.value)}
                              style={{ backgroundColor: color.value }}
                              type="button"
                            />
                          ))}
                        </div>
                      )}

                      <button
                        className="mt-5 min-h-11 w-full rounded-xl bg-[#f0c040] px-4 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPaymentWorking}
                        onClick={() => handleBuyProfileUpgrade(upgrade.id)}
                        type="button"
                      >
                        {isPaymentWorking ? "Opening Payment..." : "Buy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isCloutCardOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#111118] p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#444455]">
                    Shareable Player Card
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    My Clout Card
                  </h2>
                </div>
                <button
                  aria-label="Close clout card"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-[#888899] transition hover:text-white"
                  onClick={() => setIsCloutCardOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border-2 border-[#f0c040] bg-[#0f0f1a] p-5 shadow-[0_0_36px_rgba(240,192,64,0.14)] sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">
                    <span className="text-white">We</span>
                    <span className="text-[#f0c040]">Clout</span>
                  </p>
                  <span className="text-xs text-[#666677]">weclout.com</span>
                </div>
                <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div
                    className="h-24 w-24 shrink-0 rounded-full bg-[#7c6af7]/20 bg-cover bg-center ring-2 ring-[#f0c040]/50"
                    style={{
                      backgroundImage: profile?.photoURL
                        ? `url(${profile.photoURL})`
                        : undefined,
                    }}
                  >
                    {!profile?.photoURL && (
                      <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#f0c040]">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-bold text-white">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-[#888899]">
                      {locationText}
                    </p>
                    <div className="mt-3 inline-flex rounded-full border border-[#f0c040]/25 bg-[#f0c040]/10 px-3 py-1 text-sm font-semibold text-[#f0c040]">
                      {cloutProgress.current.emoji} {cloutProgress.current.name}
                    </div>
                  </div>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-widest text-[#666677]">
                      Total Donated
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#f0c040]">
                      {formatAmount(totalDonated)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-widest text-[#666677]">
                      Streak
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {streak} 🔥
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {earnedBadges.slice(0, 3).length > 0 ? (
                    earnedBadges.slice(0, 3).map((badge) => (
                      <span
                        className="rounded-full border border-[#f0c040]/20 bg-[#f0c040]/10 px-3 py-1 text-sm text-[#f0c040]"
                        key={badge.id}
                      >
                        {badge.emoji} {badge.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#888899]">
                      No badges unlocked yet
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  className="min-h-11 rounded-xl border border-white/[0.08] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCardWorking}
                  onClick={handleDownloadCloutCard}
                  type="button"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {isCardWorking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download Card
                  </span>
                </button>
                <button
                  className="min-h-11 rounded-xl bg-[#f0c040] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCardWorking}
                  onClick={handleShareCloutCard}
                  type="button"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {isCardWorking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    Share
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
