"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  arrayUnion,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { db, storage } from "@/lib/firebase";
import { getAllRequestsForAdmin, updateRequestDoc } from "@/lib/firestore";
import { formatAmount } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { type Request as WeCloutRequest } from "@/types";

type AdminTab =
  | "all"
  | "pending_review"
  | "quote_sent"
  | "accepted"
  | "in_progress"
  | "completed";

const tabs: Array<{ label: string; value: AdminTab }> = [
  { label: "All", value: "all" },
  { label: "Pending Review", value: "pending_review" },
  { label: "Quote Sent", value: "quote_sent" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

const statusLabels: Record<string, string> = {
  accepted: "Accepted",
  cancelled: "Cancelled",
  completed: "Completed",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  quote_sent: "Quote Sent",
  rejected: "Rejected",
};

function formatDate(value?: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : (value as { toDate?: () => Date } | undefined)?.toDate?.();

  if (!date || Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value?: unknown) {
  const date =
    value instanceof Date
      ? value
      : (value as { toDate?: () => Date } | undefined)?.toDate?.();

  if (!date) {
    return "Recently";
  }

  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) {
    return "Just now";
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((store) => store.user);
  const loading = useAuthStore((store) => store.loading);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const [requests, setRequests] = useState<WeCloutRequest[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("all");
  const [selectedRequest, setSelectedRequest] =
    useState<WeCloutRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.email !== adminEmail)) {
      router.replace("/dashboard");
    }
  }, [adminEmail, loading, router, user]);

  useEffect(() => {
    async function loadRequests() {
      if (loading || user?.email !== adminEmail) {
        return;
      }

      setIsLoading(true);

      try {
        const data = await getAllRequestsForAdmin();
        setRequests(data as WeCloutRequest[]);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load requests.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRequests();
  }, [adminEmail, loading, user?.email]);

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") {
      return requests;
    }

    return requests.filter((request) => request.status === activeTab);
  }, [activeTab, requests]);

  function refreshRequest(requestId: string, patch: Partial<WeCloutRequest>) {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, ...patch } : request,
      ),
    );
    setSelectedRequest((current) =>
      current?.id === requestId ? { ...current, ...patch } : current,
    );
  }

  async function handleSendQuote() {
    if (!selectedRequest) {
      return;
    }

    const amount = Number(quoteAmount);

    if (!amount || !quoteMessage.trim()) {
      toast.error("Fill quote amount and message.");
      return;
    }

    setIsWorking(true);

    try {
      const quote = {
        amount,
        message: quoteMessage.trim(),
        sentAt: new Date(),
      };

      await updateRequestDoc(selectedRequest.id, {
        quote,
        status: "quote_sent",
      });
      await updateDoc(doc(db, "users", selectedRequest.userId), {
        notifications: arrayUnion({
          amount,
          createdAt: new Date(),
          message: `You received a quote of ₹${amount.toLocaleString("en-IN")} for your request: ${selectedRequest.title}`,
          read: false,
          requestId: selectedRequest.id,
          type: "quote_received",
        }),
      });
      refreshRequest(selectedRequest.id, { quote, status: "quote_sent" });
      setQuoteAmount("");
      setQuoteMessage("");
      toast.success("Quote sent to user.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send quote.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleStatusUpdate(
    request: WeCloutRequest,
    status: WeCloutRequest["status"],
  ) {
    setIsWorking(true);

    try {
      await updateRequestDoc(request.id, { status });
      refreshRequest(request.id, { status });
      toast.success(`Request marked ${statusLabels[status] ?? status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCompleteRequest() {
    if (!selectedRequest) {
      return;
    }

    if (!proofFile || !completionNote.trim()) {
      toast.error("Upload proof and add a completion note.");
      return;
    }

    setIsWorking(true);

    try {
      const fileRef = ref(
        storage,
        `requests/${selectedRequest.id}/proof/${proofFile.name}`,
      );
      await uploadBytes(fileRef, proofFile, {
        contentType: proofFile.type,
      });
      const fileUrl = await getDownloadURL(fileRef);
      const proof = {
        completedAt: new Date(),
        fileUrl,
        note: completionNote.trim(),
      };

      await updateRequestDoc(selectedRequest.id, {
        proof,
        status: "completed",
      });
      await updateDoc(doc(db, "users", selectedRequest.userId), {
        notifications: arrayUnion({
          createdAt: new Date(),
          message: "Your request has been completed! Check it out 🎉",
          read: false,
          requestId: selectedRequest.id,
          type: "request_completed",
        }),
      });
      refreshRequest(selectedRequest.id, { proof, status: "completed" });
      setProofFile(null);
      setCompletionNote("");
      toast.success("Request completed with proof.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to complete request.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  function handleProofFile(event: ChangeEvent<HTMLInputElement>) {
    setProofFile(event.target.files?.[0] ?? null);
  }

  if (loading || user?.email !== adminEmail) {
    return (
      <main className="min-h-screen bg-[var(--bg)] pt-14 text-white" />
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <div className="page-enter relative mx-auto max-w-7xl py-8">
          <div className="hero-glow" />
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f0c040]">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">
              Requests Command Center
            </h1>
            <p className="mt-3 text-sm text-[#888899]">
              Review requests, send quotes, move work forward, and upload proof.
            </p>
          </header>

          <div className="mt-8 grid gap-2 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-2 md:grid-cols-6">
            {tabs.map((tab) => (
              <button
                className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab.value
                    ? "bg-[#f0c040] text-black"
                    : "text-[#888899] hover:bg-white/[0.04] hover:text-white"
                }`}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-8 flex min-h-80 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a24]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
            </div>
          ) : (
            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              {filteredRequests.map((request) => (
                <button
                  className="card-shine rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 text-left transition hover:border-white/[0.14]"
                  key={request.id}
                  onClick={() => {
                    setSelectedRequest(request);
                    setQuoteAmount(String(request.quote?.amount ?? ""));
                    setQuoteMessage(request.quote?.message ?? "");
                  }}
                  type="button"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="rounded-full border border-[#f0c040]/25 bg-[#f0c040]/10 px-2.5 py-1 text-xs font-semibold text-[#f0c040]">
                        {request.category}
                      </span>
                      <h2 className="mt-3 text-lg font-bold text-white">
                        {request.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#888899]">
                        {request.description}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-[#888899]">
                      {statusLabels[request.status] ?? request.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-[#666677] sm:grid-cols-2">
                    <p>User: {request.userName}</p>
                    <p>
                      Location: {request.location?.city},{" "}
                      {request.location?.area}, {request.location?.state}
                    </p>
                    <p>
                      Preferred:{" "}
                      {request.isFlexible
                        ? "Flexible"
                        : `${formatDate(request.preferredDate)} • ${request.preferredTime}`}
                    </p>
                    <p>Submitted: {timeAgo(request.createdAt)}</p>
                  </div>
                </button>
              ))}
            </section>
          )}
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0c040]">
                    {selectedRequest.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    {selectedRequest.title}
                  </h2>
                </div>
                <button
                  className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-[#888899]"
                  onClick={() => setSelectedRequest(null)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 text-sm text-[#888899] md:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-[#1a1a24] p-4">
                  <p className="font-semibold text-white">Full Info</p>
                  <p className="mt-3 whitespace-pre-line leading-6">
                    {selectedRequest.description}
                  </p>
                  {selectedRequest.additionalNotes && (
                    <p className="mt-3 whitespace-pre-line leading-6">
                      Notes: {selectedRequest.additionalNotes}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#1a1a24] p-4">
                  <p className="font-semibold text-white">Location & Timing</p>
                  <p className="mt-3">
                    {selectedRequest.location?.area},{" "}
                    {selectedRequest.location?.city},{" "}
                    {selectedRequest.location?.state} -{" "}
                    {selectedRequest.location?.pinCode}
                  </p>
                  {selectedRequest.location?.address && (
                    <p className="mt-2">{selectedRequest.location.address}</p>
                  )}
                  <p className="mt-2">
                    {selectedRequest.isFlexible
                      ? "Anytime works"
                      : `${formatDate(selectedRequest.preferredDate)} • ${selectedRequest.preferredTime}`}
                  </p>
                </div>
              </div>

              {selectedRequest.status === "pending_review" && (
                <section className="mt-5 rounded-2xl border border-[#f0c040]/25 bg-[#f0c040]/10 p-4">
                  <h3 className="font-bold text-white">Send Quote</h3>
                  <div className="mt-4">
                    <input
                      className="rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-3 text-white outline-none focus:border-[#f0c040]"
                      onChange={(event) => setQuoteAmount(event.target.value)}
                      placeholder="Quote Amount in ₹"
                      type="number"
                      value={quoteAmount}
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-3 text-white outline-none focus:border-[#f0c040]"
                    onChange={(event) => setQuoteMessage(event.target.value)}
                    placeholder="Explain what you'll do and what's included"
                    value={quoteMessage}
                  />
                  <button
                    className="mt-3 min-h-11 rounded-xl bg-[#f0c040] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"
                    disabled={isWorking}
                    onClick={handleSendQuote}
                    type="button"
                  >
                    Send Quote
                  </button>
                </section>
              )}

              {selectedRequest.status === "quote_sent" && selectedRequest.quote && (
                <section className="mt-5 rounded-2xl border border-[#f0c040]/25 bg-[#f0c040]/10 p-4">
                  <h3 className="font-bold text-white">Quote Sent</h3>
                  <p className="mt-2 text-3xl font-black text-[#f0c040]">
                    {formatAmount(selectedRequest.quote.amount)}
                  </p>
                  <p className="mt-2 text-sm text-[#888899]">
                    Waiting for user acceptance and payment.
                  </p>
                </section>
              )}

              {selectedRequest.status === "accepted" && (
                <section className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
                  <h3 className="font-bold text-white">Payment Confirmed</h3>
                  <p className="mt-2 text-sm text-[#888899]">
                    Paid {formatAmount(selectedRequest.payment?.amount ?? 0)}
                  </p>
                  <button
                    className="mt-3 min-h-11 rounded-xl bg-[#f0c040] px-4 py-2.5 text-sm font-bold text-black"
                    disabled={isWorking}
                    onClick={() => handleStatusUpdate(selectedRequest, "in_progress")}
                    type="button"
                  >
                    Mark as In Progress
                  </button>
                </section>
              )}

              {selectedRequest.status === "in_progress" && (
                <section className="mt-5 rounded-2xl border border-blue-400/25 bg-blue-400/10 p-4">
                  <h3 className="font-bold text-white">
                    Upload Proof & Complete
                  </h3>
                  <input
                    accept="image/*,video/*"
                    className="mt-4 block w-full rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-3 text-sm text-[#888899]"
                    onChange={handleProofFile}
                    type="file"
                  />
                  <textarea
                    className="mt-3 min-h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-3 text-white outline-none focus:border-[#f0c040]"
                    onChange={(event) => setCompletionNote(event.target.value)}
                    placeholder="Completion note"
                    value={completionNote}
                  />
                  <button
                    className="mt-3 min-h-11 rounded-xl bg-[#f0c040] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"
                    disabled={isWorking}
                    onClick={handleCompleteRequest}
                    type="button"
                  >
                    Mark as Completed
                  </button>
                </section>
              )}

              {selectedRequest.status !== "completed" &&
                selectedRequest.status !== "cancelled" && (
                  <button
                    className="mt-5 min-h-11 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
                    disabled={isWorking}
                    onClick={() => handleStatusUpdate(selectedRequest, "cancelled")}
                    type="button"
                  >
                    Cancel Request
                  </button>
                )}
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
