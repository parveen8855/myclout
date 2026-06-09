"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import { addRequest } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

const categories = [
  "Creative 🎨",
  "Flash Mob 💃",
  "Surprise 🎁",
  "Proposal 💍",
  "Prank 😂",
  "Awareness 📢",
  "Other ✨",
];

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const inputClassName =
  "w-full rounded-xl border border-white/[0.08] bg-[#1a1a24] px-3 py-3 text-white outline-none transition placeholder:text-[#444455] focus:border-[#f0c040]";

function getMinimumDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

function buildTimeSlots() {
  const slots: string[] = [];

  for (let hour = 6; hour <= 22; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) {
        continue;
      }

      const label = new Date(2026, 0, 1, hour, minute).toLocaleTimeString(
        "en-IN",
        {
          hour: "numeric",
          hour12: true,
          minute: "2-digit",
        },
      );
      slots.push(label);
    }
  }

  return slots;
}

export default function NewRequestPage() {
  const router = useRouter();
  const user = useAuthStore((store) => store.user);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "anonymous">(
    "public",
  );
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState(user?.state ?? "");
  const [pinCode, setPinCode] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [isFlexible, setIsFlexible] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const minDate = useMemo(() => getMinimumDate(), []);
  const timeSlots = useMemo(() => buildTimeSlots(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.uid) {
      toast.error("Please login first.");
      return;
    }

    if (
      !category ||
      !title.trim() ||
      !description.trim() ||
      !city.trim() ||
      !area.trim() ||
      !state ||
      !pinCode.trim() ||
      !preferredDate ||
      (!isFlexible && !preferredTime)
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (!/^\d{6}$/.test(pinCode.trim())) {
      toast.error("Pin Code must be 6 digits.");
      return;
    }

    if (preferredDate < minDate) {
      toast.error("Preferred date must be at least 3 days from today.");
      return;
    }

    setIsSubmitting(true);

    try {
      const isAnonymous = visibility === "anonymous";

      await addRequest({
        additionalNotes: additionalNotes.trim(),
        category,
        description: description.trim(),
        isAnonymous,
        isFlexible,
        location: {
          address: address.trim(),
          area: area.trim(),
          city: city.trim(),
          pinCode: pinCode.trim(),
          state,
        },
        preferredDate: new Date(`${preferredDate}T00:00:00`),
        preferredTime: isFlexible ? "Anytime works for me" : preferredTime,
        quote: null,
        status: "pending_review",
        title: title.trim(),
        userId: user.uid,
        userName: isAnonymous
          ? "Anonymous"
          : user.name ?? user.displayName ?? "WeClout User",
      });

      setIsSubmitted(true);
      toast.success("Request submitted!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
          <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
            <section className="card-shine rounded-2xl border border-[#f0c040]/25 bg-[#1a1a24] p-8 text-center">
              <p className="text-5xl">🎉</p>
              <h1 className="mt-4 text-3xl font-bold text-white">
                Request Submitted!
              </h1>
              <p className="mt-3 text-[#888899]">
                We&apos;ll review and send you a quote within 24 hours.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  className="rounded-xl bg-[#f0c040] px-5 py-3 text-sm font-bold text-black"
                  href="/requests"
                >
                  View My Requests
                </Link>
                <button
                  className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-bold text-white"
                  onClick={() => {
                    setIsSubmitted(false);
                    router.refresh();
                  }}
                  type="button"
                >
                  Submit Another
                </button>
              </div>
            </section>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:pb-8">
        <div className="page-enter relative mx-auto max-w-4xl py-8">
          <div className="hero-glow" />
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#888899] transition hover:text-white"
            href="/requests"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>
          <header className="relative z-10 mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f0c040]">
              Make it Happen
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Submit Request
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#888899]">
              This step is free. Our team reviews the details and sends a quote
              before any payment.
            </p>
          </header>

          <form
            className="relative z-10 mt-8 space-y-5 rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-4 sm:p-6"
            onSubmit={handleSubmit}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                Category
              </span>
              <select
                className={inputClassName}
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                Title
              </span>
              <input
                className={inputClassName}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What do you want us to do?"
                value={title}
              />
              <p className="mt-1 text-right text-xs text-[#666677]">
                {title.length}/100
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                Description
              </span>
              <textarea
                className={`${inputClassName} min-h-36 resize-none`}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe in detail what you want, how you want it, any specific requirements..."
                value={description}
              />
              <p className="mt-1 text-right text-xs text-[#666677]">
                {description.length}/500
              </p>
            </label>

            <section>
              <p className="mb-3 text-sm font-semibold text-white">
                Visibility
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "🌍 Public",
                    text: "Everyone can see this request and the moment",
                    value: "public",
                  },
                  {
                    label: "👻 Anonymous",
                    text: "Request and moment stays private",
                    value: "anonymous",
                  },
                ].map((option) => (
                  <label
                    className={`cursor-pointer rounded-xl border p-4 ${
                      visibility === option.value
                        ? "border-[#f0c040]/40 bg-[#f0c040]/10"
                        : "border-white/[0.08] bg-[#16161f]"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={visibility === option.value}
                      className="mr-2"
                      onChange={() =>
                        setVisibility(option.value as "public" | "anonymous")
                      }
                      type="radio"
                    />
                    <span className="font-semibold text-white">
                      {option.label}
                    </span>
                    <p className="mt-2 text-sm text-[#888899]">{option.text}</p>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#16161f] p-4">
              <h2 className="text-sm font-semibold text-white">
                Where should this happen?
              </h2>
              <p className="mt-1 text-xs text-[#888899]">
                Our team will be at this location
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClassName}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                  value={city}
                />
                <input
                  className={inputClassName}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder="Area / Locality"
                  value={area}
                />
                <select
                  className={inputClassName}
                  onChange={(event) => setState(event.target.value)}
                  value={state}
                >
                  <option value="">Select state</option>
                  {indianStates.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setPinCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Pin Code"
                  value={pinCode}
                />
              </div>
              <textarea
                className={`${inputClassName} mt-3 min-h-24 resize-none`}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Full Address (optional)"
                value={address}
              />
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#16161f] p-4">
              <h2 className="text-sm font-semibold text-white">
                Date & Time
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs text-[#888899]">
                    Preferred Date
                  </span>
                  <input
                    className={inputClassName}
                    min={minDate}
                    onChange={(event) => setPreferredDate(event.target.value)}
                    type="date"
                    value={preferredDate}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs text-[#888899]">
                    Preferred Time
                  </span>
                  <select
                    className={inputClassName}
                    disabled={isFlexible}
                    onChange={(event) => setPreferredTime(event.target.value)}
                    value={preferredTime}
                  >
                    <option value="">Select time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a24] p-3 text-sm text-white">
                <span>I&apos;m flexible on timing</span>
                <input
                  checked={isFlexible}
                  onChange={(event) => setIsFlexible(event.target.checked)}
                  type="checkbox"
                />
              </label>
              {isFlexible && (
                <p className="mt-2 text-sm text-[#f0c040]">
                  Anytime works for me
                </p>
              )}
              <p className="mt-3 text-xs text-[#888899]">
                We&apos;ll confirm availability after reviewing your request
              </p>
            </section>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                Additional Notes
              </span>
              <textarea
                className={`${inputClassName} min-h-28 resize-none`}
                maxLength={300}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                placeholder="Anything else we should know? Special instructions, people involved, etc."
                value={additionalNotes}
              />
              <p className="mt-1 text-right text-xs text-[#666677]">
                {additionalNotes.length}/300
              </p>
            </label>

            <button
              className="min-h-12 w-full rounded-xl bg-[#f0c040] px-5 py-3 text-sm font-black text-black transition hover:bg-[#ffe680] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Submitting..."
                : "Submit Request — We'll send you a quote"}
            </button>
          </form>
        </div>
      </main>
    </PageTransition>
  );
}
