"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { getRequest } from "@/lib/firestore";
import { formatAmount } from "@/lib/utils";
import { type Request as WeCloutRequest } from "@/types";

type RequestStatus = WeCloutRequest["status"];

const timelineSteps = [
  {
    id: "submitted",
    label: "📝 Request Submitted",
    statuses: ["pending_review", "quote_sent", "accepted", "in_progress", "completed"] as RequestStatus[],
  },
  {
    id: "quote",
    label: "💬 Quote Sent",
    statuses: ["quote_sent", "accepted", "in_progress", "completed"] as RequestStatus[],
  },
  {
    id: "paid",
    label: "✅ Quote Accepted & Paid",
    statuses: ["accepted", "in_progress", "completed"] as RequestStatus[],
  },
  {
    id: "progress",
    label: "🔨 In Progress",
    statuses: ["in_progress", "completed"] as RequestStatus[],
  },
  {
    id: "completed",
    label: "🎉 Completed!",
    statuses: ["completed"] as RequestStatus[],
  },
] as const;

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

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<WeCloutRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeStatus = request?.status ?? "pending_review";
  const currentStepIndex = useMemo(() => {
    return Math.max(
      0,
      timelineSteps.findLastIndex((step) =>
        step.statuses.includes(activeStatus),
      ),
    );
  }, [activeStatus]);

  useEffect(() => {
    async function loadRequest() {
      if (!params.id) {
        return;
      }

      setIsLoading(true);

      try {
        const data = await getRequest(params.id);
        setRequest(data as WeCloutRequest | null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load request.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRequest();
  }, [params.id]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <div className="mx-auto max-w-4xl py-8">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#888899] transition hover:text-white"
            href="/requests"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>

          {isLoading ? (
            <div className="mt-10 flex min-h-96 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a24]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c040]" />
            </div>
          ) : !request ? (
            <div className="mt-10 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-8 text-center">
              <h1 className="text-2xl font-bold text-white">
                Request not found
              </h1>
              <p className="mt-2 text-sm text-[#888899]">
                This request may have been removed.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              <section className="card-shine rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0c040]">
                      {request.category}
                    </p>
                    <h1 className="mt-3 text-3xl font-bold text-white">
                      {request.title}
                    </h1>
                    <p className="mt-2 text-sm text-[#888899]">
                      {request.location?.area}, {request.location?.city},{" "}
                      {request.location?.state}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#f0c040]/30 bg-[#f0c040]/10 px-3 py-1 text-xs font-semibold text-[#f0c040]">
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#f0f0f0]/80">
                  {request.description}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-[#16161f] p-4">
                    <p className="text-sm font-semibold text-white">
                      Location
                    </p>
                    <p className="mt-2 text-sm text-[#888899]">
                      {request.location?.address
                        ? `${request.location.address}, `
                        : ""}
                      {request.location?.area}, {request.location?.city},{" "}
                      {request.location?.state} - {request.location?.pinCode}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#16161f] p-4">
                    <p className="text-sm font-semibold text-white">
                      Preferred Time
                    </p>
                    <p className="mt-2 text-sm text-[#888899]">
                      {request.isFlexible
                        ? "Anytime works for me"
                        : `${formatDate(request.preferredDate)} at ${request.preferredTime}`}
                    </p>
                  </div>
                </div>

                {request.quote && (
                  <div className="mt-6 rounded-xl border border-[#f0c040]/25 bg-[#f0c040]/10 p-4">
                    <p className="text-sm text-[#f0c040]">Quote</p>
                    <p className="mt-1 text-3xl font-bold text-[#f0c040]">
                      {formatAmount(request.quote.amount)}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#f0f0f0]/80">
                      {request.quote.message}
                    </p>
                  </div>
                )}

                {request.payment && (
                  <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4">
                    <p className="font-semibold text-emerald-300">
                      Payment received
                    </p>
                    <p className="mt-1 text-sm text-[#888899]">
                      {formatAmount(request.payment.amount)}
                    </p>
                  </div>
                )}

                {request.proof && (
                  <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4">
                    <p className="font-semibold text-emerald-300">
                      Completion Proof
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-[#f0f0f0]/80">
                      {request.proof.note}
                    </p>
                    <a
                      className="mt-3 inline-flex text-sm font-bold text-[#f0c040]"
                      href={request.proof.fileUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View uploaded proof →
                    </a>
                  </div>
                )}
              </section>

              <section className="card-shine rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 sm:p-6">
                <h2 className="text-xl font-bold text-white">
                  Status Timeline
                </h2>
                <div className="mt-5 space-y-3">
                  {timelineSteps.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    const isDone = index < currentStepIndex;

                    return (
                      <div
                        className={`rounded-xl border p-4 transition ${
                          isCurrent
                            ? "border-[#f0c040]/70 bg-[#f0c040]/10 text-[#f0c040]"
                            : isDone
                              ? "border-green-400/30 bg-green-400/5 text-green-300"
                              : "border-white/[0.08] bg-[#16161f] text-[#444455]"
                        }`}
                        key={step.id}
                      >
                        <p className="font-semibold">{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 text-center text-sm text-[#888899]">
                Questions?{" "}
                <a
                  className="font-semibold text-[#f0c040] transition hover:text-[#ffd75e]"
                  href="mailto:support@weclout.app"
                >
                  Contact us
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
