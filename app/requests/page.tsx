"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import {
  arrayUnion,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { db } from "@/lib/firebase";
import { updateRequestDoc } from "@/lib/firestore";
import { openRazorpay } from "@/lib/razorpay";
import { formatAmount } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { type Request as WeCloutRequest } from "@/types";

type RequestStatus = WeCloutRequest["status"];
type CommunityFilter = "all" | "in_progress" | "completed" | "awaiting_quote";

const myStatusStyles: Record<RequestStatus, { className: string; label: string }> = {
  accepted: {
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    label: "✅ Accepted",
  },
  cancelled: {
    className: "border-red-400/25 bg-red-400/10 text-red-300",
    label: "❌ Cancelled",
  },
  completed: {
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    label: "🎉 Completed",
  },
  in_progress: {
    className: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    label: "🔨 In Progress",
  },
  pending_review: {
    className: "border-white/[0.08] bg-white/[0.04] text-[#888899]",
    label: "⏳ Under Review",
  },
  quote_sent: {
    className: "border-[#f0c040]/35 bg-[#f0c040]/10 text-[#f0c040]",
    label: "💬 Quote Received",
  },
  rejected: {
    className: "border-red-400/25 bg-red-400/10 text-red-300",
    label: "❌ Rejected",
  },
};

const communityStatusStyles: Record<RequestStatus, { className: string; label: string; pulse?: boolean }> = {
  accepted: {
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    label: "✅ Accepted",
  },
  cancelled: {
    className: "border-red-400/25 bg-red-400/10 text-red-300",
    label: "❌ Cancelled",
  },
  completed: {
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    label: "🎉 Completed",
  },
  in_progress: {
    className: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    label: "🔨 In Progress",
    pulse: true,
  },
  pending_review: {
    className: "border-white/[0.08] bg-white/[0.04] text-[#888899]",
    label: "⏳ Awaiting Quote",
  },
  quote_sent: {
    className: "border-[#f0c040]/35 bg-[#f0c040]/10 text-[#f0c040]",
    label: "💬 Quote Sent",
  },
  rejected: {
    className: "border-red-400/25 bg-red-400/10 text-red-300",
    label: "❌ Rejected",
  },
};

const communityFilters: Array<{ label: string; value: CommunityFilter }> = [
  { label: "All", value: "all" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Awaiting Quote", value: "awaiting_quote" },
];

function toDate(value?: unknown) {
  return value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : (value as { toDate?: () => Date } | undefined)?.toDate?.();
}

function formatRequestDate(value?: unknown) {
  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function requestTime(value?: unknown) {
  const date = toDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function truncate(text = "", max = 100) {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function ProofPreview({ request }: { request: WeCloutRequest }) {
  if (!request.proof?.fileUrl) {
    return null;
  }

  const url = request.proof.fileUrl;
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
      {isVideo ? (
        <video className="max-h-64 w-full object-cover" controls src={url} />
      ) : (
        <img
          alt={`${request.title} proof`}
          className="max-h-64 w-full object-cover"
          src={url}
        />
      )}
      {request.proof.note && (
        <p className="p-3 text-sm text-[#888899]">{request.proof.note}</p>
      )}
    </div>
  );
}

export default function RequestsPage() {
  const user = useAuthStore((store) => store.user);
  const loading = useAuthStore((store) => store.loading);
  const [myRequests, setMyRequests] = useState<WeCloutRequest[]>([]);
  const [communityRequests, setCommunityRequests] = useState<WeCloutRequest[]>([]);
  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [quoteBannerDismissed, setQuoteBannerDismissed] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>("all");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user?.uid) {
      setMyRequests([]);
      setIsLoadingMine(false);
      return;
    }

    setIsLoadingMine(true);

    const myRequestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      myRequestsQuery,
      (snapshot) => {
        setMyRequests(
          (snapshot.docs.map((requestDoc) => ({
            id: requestDoc.id,
            ...requestDoc.data(),
          })) as WeCloutRequest[])
            .sort((a, b) => requestTime(b.createdAt) - requestTime(a.createdAt))
            .slice(0, 50),
        );
        setIsLoadingMine(false);
      },
      (error) => {
        console.log("My requests realtime error:", error);
        toast.error("Unable to load your requests.");
        setIsLoadingMine(false);
      },
    );

    return unsubscribe;
  }, [loading, user?.uid]);

  useEffect(() => {
    setIsLoadingCommunity(true);

    const communityQuery = query(
      collection(db, "requests"),
    );

    const unsubscribe = onSnapshot(
      communityQuery,
      (snapshot) => {
        setCommunityRequests(
          snapshot.docs
            .map((requestDoc) => ({
              id: requestDoc.id,
              ...requestDoc.data(),
            }) as WeCloutRequest)
            .filter((request) => request.status !== "cancelled")
            .sort((a, b) => requestTime(b.createdAt) - requestTime(a.createdAt))
            .slice(0, 100) as WeCloutRequest[],
        );
        setIsLoadingCommunity(false);
      },
      (error) => {
        console.log("Community requests realtime error:", error);
        toast.error("Unable to load community requests.");
        setIsLoadingCommunity(false);
      },
    );

    return unsubscribe;
  }, []);

  const quoteRequests = useMemo(
    () => myRequests.filter((request) => request.status === "quote_sent"),
    [myRequests],
  );
  const showQuoteBanner = quoteRequests.length > 0 && !quoteBannerDismissed;
  const filteredCommunityRequests = useMemo(() => {
    if (communityFilter === "all") {
      return communityRequests;
    }

    if (communityFilter === "awaiting_quote") {
      return communityRequests.filter(
        (request) => request.status === "pending_review" || request.status === "quote_sent",
      );
    }

    return communityRequests.filter((request) => request.status === communityFilter);
  }, [communityFilter, communityRequests]);
  const inspirationRequests = useMemo(() => {
    const completed = communityRequests.filter(
      (request) => request.status === "completed",
    );

    return [...completed]
      .sort((a, b) => `${a.id}`.localeCompare(`${b.id}`))
      .slice(0, 3);
  }, [communityRequests]);

  async function notifyAdmin(request: WeCloutRequest, amount: number) {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    if (!adminEmail) {
      return;
    }

    const adminQuery = query(
      collection(db, "users"),
      where("email", "==", adminEmail),
    );
    const snapshot = await getDocs(adminQuery);

    await Promise.all(
      snapshot.docs.map((adminDoc) =>
        updateDoc(adminDoc.ref, {
          notifications: arrayUnion({
            amount,
            createdAt: new Date(),
            message: "Payment received for request!",
            read: false,
            requestId: request.id,
            type: "payment_received",
          }),
        }),
      ),
    );
  }

  async function handleAcceptQuote(request: WeCloutRequest) {
    if (!user?.uid) {
      toast.error("Please login first.");
      return;
    }

    const amount = Number(request.quote?.amount ?? 0);

    if (!amount) {
      toast.error("Quote amount missing.");
      return;
    }

    setPayingRequestId(request.id);

    try {
      const orderResponse = await fetch("/api/create-order", {
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `quote_${request.id.slice(0, 8)}_${Date.now()}`,
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
        amount,
        description: `Make it Happen Quote - ${request.title}`,
        name: "WeClout",
        onDismiss: () => setPayingRequestId(null),
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

          await updateRequestDoc(request.id, {
            payment: {
              amount,
              paidAt: serverTimestamp(),
              paymentId: response.razorpay_payment_id,
            },
            status: "accepted",
          });
          await notifyAdmin(request, amount);
          setPayingRequestId(null);
          toast.success("Payment successful! Our team will be in touch soon 🎉");
        },
        orderId,
        prefill: {
          email: user.email ?? "",
          name: user.name ?? user.displayName ?? "WeClouter",
        },
      });
    } catch (error) {
      setPayingRequestId(null);
      toast.error(error instanceof Error ? error.message : "Payment failed.");
    }
  }

  async function handleRejectQuote(request: WeCloutRequest) {
    const confirmed = window.confirm(
      "Are you sure? You can submit a new request anytime",
    );

    if (!confirmed) {
      return;
    }

    await updateRequestDoc(request.id, {
      rejectedAt: serverTimestamp(),
      status: "cancelled",
    });
    toast.success("Quote rejected. Feel free to submit a new request!");
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <div className="page-enter relative mx-auto max-w-6xl">
          <div className="hero-glow" />
          <section className="relative z-10 flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f0c040]">
                Make it Happen
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Submit first. Pay after quote.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#888899]">
                Tell us what you want. We review it, send a quote, and only then
                you decide whether to pay.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f0c040] px-4 py-3 font-bold text-[#111118] transition hover:bg-[#ffd75e] sm:w-auto"
              href="/requests/new"
            >
              <Plus className="h-5 w-5" />
              Make it Happen
            </Link>
          </section>

          {showQuoteBanner && (
            <section className="relative z-10 mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[#f0c040]/35 bg-[#f0c040]/10 p-4 text-[#f0c040] shadow-[0_0_28px_rgba(240,192,64,0.08)]">
              <p className="text-sm font-bold">
                💬 You have a new quote waiting! Scroll down to review it
              </p>
              <button
                aria-label="Dismiss quote banner"
                className="rounded-full p-1 transition hover:bg-[#f0c040]/10"
                onClick={() => setQuoteBannerDismissed(true)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </section>
          )}

          <div className="space-y-8">
            <section className="card-shine relative z-10 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
              <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-4">
                <h2 className="text-xl font-bold text-white">My Requests</h2>
                <p className="text-sm text-[#888899]">
                  Track quotes, payments, progress, and final proof.
                </p>
              </div>

              {isLoadingMine ? (
                <div className="flex min-h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
                </div>
              ) : myRequests.length === 0 ? (
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#16161f] p-6 text-center">
                  <p className="font-semibold text-white">
                    No requests submitted yet.
                  </p>
                  <p className="mt-2 text-sm text-[#888899]">
                    Create one and we’ll send a quote within 24 hours.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {myRequests.map((request) => {
                    const status =
                      myStatusStyles[request.status] ?? myStatusStyles.pending_review;

                    return (
                      <article
                        className={`rounded-2xl border bg-[#16161f] p-4 ${
                          request.status === "quote_sent"
                            ? "border-[#f0c040]/35 shadow-[0_0_28px_rgba(240,192,64,0.08)]"
                            : "border-white/[0.08]"
                        }`}
                        key={request.id}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#444455]">
                              {request.category}
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              {request.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#888899]">
                              {request.description}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-[#666677]">
                          {request.location?.area}, {request.location?.city},{" "}
                          {request.location?.state} •{" "}
                          {request.isFlexible
                            ? "Anytime works"
                            : `${formatRequestDate(request.preferredDate)} at ${request.preferredTime}`}
                        </p>

                        {request.status === "quote_sent" && request.quote && (
                          <div className="mt-4 rounded-2xl border border-[#f0c040]/30 bg-[#f0c040]/10 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-[#f0c040]">
                              You have a quote!
                            </p>
                            <p className="mt-2 text-3xl font-black text-[#f0c040]">
                              {formatAmount(request.quote.amount)}
                            </p>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#f0f0f0]/80">
                              {request.quote.message}
                            </p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <button
                                className="min-h-11 rounded-xl bg-[#f0c040] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#ffe680] disabled:opacity-60"
                                disabled={payingRequestId === request.id}
                                onClick={() => handleAcceptQuote(request)}
                                type="button"
                              >
                                {payingRequestId === request.id
                                  ? "Opening Payment..."
                                  : `✅ Accept & Pay ${formatAmount(request.quote.amount)}`}
                              </button>
                              <button
                                className="min-h-11 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
                                onClick={() => handleRejectQuote(request)}
                                type="button"
                              >
                                ❌ Reject Quote
                              </button>
                            </div>
                          </div>
                        )}

                        <Link
                          className="mt-4 inline-flex text-sm font-semibold text-[#f0c040] hover:text-[#ffe680]"
                          href={`/requests/${request.id}`}
                        >
                          View details →
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card-shine relative z-10 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-5">
              <div className="border-b border-white/[0.06] pb-4">
                <h2 className="text-xl font-bold text-white">
                  Community Requests
                </h2>
                <p className="mt-1 text-sm text-[#888899]">
                  See what people are asking WeClout to make happen.
                </p>
              </div>

              {inspirationRequests.length > 0 && (
                <div className="mt-5 rounded-2xl border border-[#f0c040]/15 bg-[#f0c040]/[0.04] p-4">
                  <p className="text-sm font-bold text-[#f0c040]">
                    Recent Moments We Made Happen ✨
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {inspirationRequests.map((request) => (
                      <Link
                        className="rounded-xl border border-white/[0.08] bg-[#16161f] p-3 transition hover:border-[#f0c040]/25"
                        href={`/requests/${request.id}`}
                        key={request.id}
                      >
                        <p className="text-xs text-[#444455]">{request.category}</p>
                        <p className="mt-2 line-clamp-2 text-sm font-bold text-white">
                          {request.title}
                        </p>
                        <p className="mt-2 text-xs text-[#888899]">
                          {request.location?.city}, {request.location?.state}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-2 rounded-2xl border border-white/[0.08] bg-[#111118] p-2 sm:grid-cols-4">
                {communityFilters.map((filter) => (
                  <button
                    className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      communityFilter === filter.value
                        ? "bg-[#f0c040] text-black"
                        : "text-[#888899] hover:bg-white/[0.04] hover:text-white"
                    }`}
                    key={filter.value}
                    onClick={() => setCommunityFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {isLoadingCommunity ? (
                <div className="flex min-h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
                </div>
              ) : filteredCommunityRequests.length === 0 ? (
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#16161f] p-6 text-center text-sm text-[#888899]">
                  No community requests in this filter yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {filteredCommunityRequests.map((request) => {
                    const status =
                      communityStatusStyles[request.status] ??
                      communityStatusStyles.pending_review;
                    const publicName = request.isAnonymous
                      ? "Anonymous 👻"
                      : request.userName || "WeClout User";

                    return (
                      <Link
                        className="card-shine rounded-2xl border border-white/[0.08] bg-[#16161f] p-4 transition hover:border-white/[0.14]"
                        href={`/requests/${request.id}`}
                        key={request.id}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <span className="rounded-full border border-[#f0c040]/25 bg-[#f0c040]/10 px-2.5 py-1 text-xs font-semibold text-[#f0c040]">
                              {request.category}
                            </span>
                            <p className="mt-3 text-xs font-semibold text-[#888899]">
                              {publicName}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.pulse && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
                            )}
                            {status.label}
                          </span>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">
                          {request.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#888899]">
                          {truncate(request.description)}
                        </p>
                        <p className="mt-3 text-xs text-[#666677]">
                          {request.location?.city}, {request.location?.state} •{" "}
                          {timeAgo(request.createdAt)}
                        </p>
                        {request.status === "completed" && (
                          <ProofPreview request={request} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
