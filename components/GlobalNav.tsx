"use client";

import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";

interface NotificationItem {
  amount?: number;
  createdAt?: unknown;
  message?: string;
  read?: boolean;
  requestId?: string;
  type?: string;
}

const desktopLinks = [
  { href: "/", label: "Home", match: "/" },
  { href: "/leaderboard", label: "Leaderboard", match: "/leaderboard" },
  { href: "/war-room", label: "War Room", match: "/war-room", activeCampaign: true },
  { href: "/requests", label: "Requests", match: "/requests" },
  { href: "/made-my-day", label: "Made My Day", match: "/made-my-day" },
  { href: "/clout-for-good", label: "Impact", match: "/clout-for-good" },
  { href: "/hall-of-fame", label: "Hall of Fame", match: "/hall-of-fame" },
  { href: "/about", label: "About", match: "/about" },
];

const mobileLinks = [
  { href: "/", label: "Home", match: "/" },
  { href: "/leaderboard", label: "Leaderboard", match: "/leaderboard" },
  { href: "/war-room", label: "War Room", match: "/war-room", activeCampaign: true },
  { href: "/requests", label: "Requests", match: "/requests" },
  { href: "/made-my-day", label: "Made My Day", match: "/made-my-day" },
  { href: "/clout-for-good", label: "Impact", match: "/clout-for-good" },
  { href: "/hall-of-fame", label: "Hall of Fame", match: "/hall-of-fame" },
  { href: "/about", label: "About", match: "/about" },
  { href: "/profile", label: "Profile", match: "/profile" },
];

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`);
}

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
    return "Recently";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function getNotificationIcon(type?: string) {
  if (type === "quote_received") return "💬";
  if (type === "payment_received") return "💰";
  if (type === "request_completed") return "🎉";
  return "🔔";
}

export default function GlobalNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const displayName = user?.name ?? user?.displayName ?? "Profile";
  const email = user?.email ?? "";
  const photoURL = user?.photoURL;
  const unreadNotifications =
    notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setNotificationMenuOpen(false);
      }
    }

    if (notificationMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [notificationMenuOpen]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const userNotifications =
        (snapshot.data()?.notifications as NotificationItem[] | undefined) ?? [];

      setNotifications(
        [...userNotifications].sort((a, b) => {
          return (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0);
        }),
      );
    });

    return unsubscribe;
  }, [user?.uid]);

  async function handleSignOut() {
    try {
      await signOut(auth);
      setUser(null);
      setMenuOpen(false);
      setProfileMenuOpen(false);
      toast.success("Signed out successfully");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  async function updateNotifications(nextNotifications: NotificationItem[]) {
    if (!user?.uid) return;

    setNotifications(nextNotifications);
    await updateDoc(doc(db, "users", user.uid), {
      notifications: nextNotifications,
    });
  }

  async function handleNotificationClick(index: number) {
    const nextNotifications = notifications.map((notification, currentIndex) =>
      currentIndex === index ? { ...notification, read: true } : notification,
    );

    await updateNotifications(nextNotifications);
    setNotificationMenuOpen(false);
    router.push("/requests");
  }

  async function handleMarkAllRead() {
    await updateNotifications(
      notifications.map((notification) => ({ ...notification, read: true })),
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 border-b border-white/[0.06] bg-[#111118]/80 px-4 backdrop-blur-2xl sm:px-6 md:px-8">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-5">
          <Link
            className="text-[16px] font-bold tracking-tight"
            href="/"
          >
            <span className="text-white">We</span><span className="gold-shimmer">Clout</span>
          </Link>

          <div className="hidden items-center gap-5 lg:gap-7 md:flex">
            {desktopLinks.map((link) => {
              const active = isActive(pathname, link.match);

              return (
                <Link
                  className={`relative text-[13px] font-medium transition-colors duration-200 ${
                    active ? "text-white" : "text-[#888899] hover:text-[#f0f0f0]"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  {link.activeCampaign && (
                    <span className="absolute -right-2 top-0 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  )}
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f0c040]" style={{ animation: "dotPop 0.25s ease-out forwards" }} />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative" ref={notificationMenuRef}>
              <button
                aria-expanded={notificationMenuOpen}
                aria-label="Notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#888899] transition-colors duration-200 hover:text-[#f0f0f0] md:h-auto md:w-auto"
                onClick={() => setNotificationMenuOpen((current) => !current)}
                type="button"
              >
                <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {unreadNotifications > 0 && (
                  <>
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 md:-right-1 md:-top-1" />
                    <span className="sr-only">
                      {unreadNotifications} unread notifications
                    </span>
                  </>
                )}
              </button>

              {notificationMenuOpen && (
                <div className="absolute right-0 top-11 z-[70] w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118] shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Notifications
                      </p>
                      <p className="mt-1 text-xs text-[#888899]">
                        {unreadNotifications} unread
                      </p>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-[#f0c040] transition hover:bg-[#f0c040]/10"
                        onClick={handleMarkAllRead}
                        type="button"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-white/[0.08]" />
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-[#888899]">
                      No notifications yet.
                    </p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto p-2">
                      {notifications.map((notification, index) => (
                        <button
                          className={`flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-white/[0.05] ${
                            notification.read ? "opacity-60" : "bg-white/[0.03]"
                          }`}
                          key={`${notification.type}-${notification.requestId ?? index}-${index}`}
                          onClick={() => handleNotificationClick(index)}
                          type="button"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0c040]/10 text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-white">
                              {notification.message ?? "New notification"}
                            </span>
                            <span className="mt-1 block text-xs text-[#888899]">
                              {timeAgo(notification.createdAt)}
                            </span>
                          </span>
                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                aria-expanded={profileMenuOpen}
                aria-label="Open profile menu"
                className={`relative h-7 w-7 rounded-full bg-[#1a1a24] bg-cover bg-center bg-no-repeat ring-1 ring-white/10 transition hover:ring-white/20 md:h-7 md:w-7 ${
                  user?.upgrades?.animatedBorder ? "animated-profile-border" : ""
                }`}
                onClick={() => setProfileMenuOpen((current) => !current)}
                style={{
                  backgroundImage: photoURL ? `url(${photoURL})` : undefined,
                }}
                type="button"
              >
                {!photoURL && (
                  <span className="flex h-full w-full items-center justify-center rounded-full text-[11px] font-semibold text-[#f0c040]">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-10 z-[70] w-64 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118] shadow-2xl shadow-black/40">
                  <div className="p-4">
                    <p className="truncate text-sm font-bold text-white">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#888899]">
                      {email || "No email connected"}
                    </p>
                  </div>
                  <div className="h-px bg-white/[0.08]" />
                  <div className="p-2">
                    <Link
                      className="flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-[#f0f0f0] transition hover:bg-white/[0.05]"
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      👤 My Profile
                    </Link>
                    <Link
                      className="flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-[#f0f0f0] transition hover:bg-white/[0.05]"
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      ⚙️ Settings
                    </Link>
                  </div>
                  <div className="h-px bg-white/[0.08]" />
                  <div className="p-2">
                    <button
                      className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
                      onClick={handleSignOut}
                      type="button"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] text-[#f0f0f0] transition hover:border-white/[0.14] md:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#111118]/98 px-4 pb-8 pt-20 backdrop-blur-2xl md:hidden">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {mobileLinks.map((link) => {
              const active = isActive(pathname, link.match);

              return (
                <Link
                  className={`relative flex min-h-12 items-center justify-between rounded-2xl border px-4 text-[15px] font-semibold transition ${
                    active
                      ? "border-[#f0c040]/25 bg-[#f0c040]/10 text-white"
                      : "border-white/[0.08] bg-[#1a1a24] text-[#888899] hover:text-white"
                  }`}
                  href={link.href}
                  key={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    {link.activeCampaign && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    )}
                    {link.label}
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-[#f0c040]" />}
                </Link>
              );
            })}
            <button
              className="relative flex min-h-12 items-center rounded-2xl border border-red-400/20 bg-red-400/10 px-4 text-left text-[15px] font-semibold text-red-300 transition hover:bg-red-400/15"
              onClick={handleSignOut}
              type="button"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
