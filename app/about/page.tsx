"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { BADGES } from "@/types";

const missionCards = [
  {
    label: "Why We Exist",
    title: "Turn pride into power",
    text: "Regional pride is one of India's strongest forces. We did not fight it. We channeled it. Your love for your state now feeds someone's child in that state.",
  },
  {
    label: "How We Work",
    title: "Compete. Donate. Prove it.",
    text: "Every rupee is tracked. Every impact is photographed. Every claim is verified. We believe transparency is not optional — it is the product.",
  },
  {
    label: "Where We Are Going",
    title: "India first. World next.",
    text: "We started in Haryana. We are growing across India. One day, every country will have its own War Room. This is just Week 1.",
  },
];

const stats = [
  { label: "Founder", prefix: "", suffix: "", target: 1 },
  { label: "Investors", prefix: "", suffix: "", target: 0 },
  { label: "Ambition", staticValue: "∞" },
  { label: "Marketing budget", prefix: "₹", suffix: "", target: 0 },
];

const contacts = [
  {
    button: "Send Email",
    description: "For partnerships, press, and everything else",
    href: "mailto:contact@weclout.com",
    label: "Email",
    value: "contact@weclout.com",
  },
  {
    button: "Follow Us",
    description: "Follow the journey. DM us anytime.",
    href: "https://instagram.com/WeClout",
    label: "Instagram",
    value: "@WeClout",
  },
];

function CountUpStat({
  prefix = "",
  staticValue,
  suffix = "",
  target = 0,
}: {
  prefix?: string;
  staticValue?: string;
  suffix?: string;
  target?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (staticValue) {
      return;
    }

    const duration = 900;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      setValue(Math.round(target * progress));

      if (progress === 1) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [staticValue, target]);

  return (
    <span>
      {staticValue ?? `${prefix}${value.toLocaleString("en-IN")}${suffix}`}
    </span>
  );
}

export default function AboutPage() {
  const badges = Object.values(BADGES);

  return (
    <PageTransition>
      <main className="min-h-screen overflow-hidden bg-[var(--bg)] px-4 pb-20 pt-14 text-white sm:px-6 md:px-8 md:pb-10">
        <div className="page-enter relative mx-auto max-w-6xl py-10">
          <div className="hero-glow" />

          <section className="relative z-10 mx-auto max-w-4xl py-10 text-center sm:py-16">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f0c040]/70">
              Our Story
            </p>
            <h1 className="text-[38px] font-semibold leading-tight tracking-tight text-white sm:text-[56px] md:text-[68px]">
              <span>We</span>
              <span className="gold-shimmer">Clout</span>
              <span> was born from anger.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#888899] sm:text-xl">
              Not the bad kind. The kind that changes things.
            </p>
          </section>

          <section className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-white/[0.08] bg-[#1a1a24]/85 p-5 shadow-2xl shadow-black/30 sm:p-8 md:p-10">
            <div className="space-y-6 text-[15px] leading-8 text-[#d8d8df] sm:text-[17px] sm:leading-9">
              <p>
                It was 2 AM. I was scrolling through Instagram watching people
                flex their Lamborghinis and Dubai trips. Meanwhile, my
                neighbour — a retired school teacher — was struggling to pay
                her electricity bill.
              </p>
              <p>
                That night I thought: what if the people flexing their wealth
                actually competed to help people? What if showing off money
                meant something real?
              </p>
              <p className="text-xl font-semibold text-white">
                What if your clout could change someone&apos;s life?
              </p>
              <p>
                I am just one person from Rewari, Haryana. No VC funding. No
                big team. No office. Just a laptop, a vision, and a belief that
                India&apos;s pride — its regional pride — can become its greatest
                strength.
              </p>
              <p>
                WeClout is not a charity. It is not a competition. It is both.
                It is neither.
              </p>
              <p>
                It is what happens when people stop just talking about helping
                and actually start doing it — with receipts, with proof, with
                fire.
              </p>
              <p>
                Every donation on this platform is a statement: I was here. I
                helped. My state showed up.
              </p>
              <p className="text-white">We are just getting started.</p>
            </div>
            <div className="mt-8 border-t border-white/[0.08] pt-6 text-[15px] font-semibold text-[#f0c040]">
              — Parveen Siwach, Founder
            </div>
          </section>

          <section className="relative z-10 mt-14">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#444455]">
                Mission
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {missionCards.map((card) => (
                <article
                  className="card-shine rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 transition hover:border-white/[0.14] hover:bg-[#1f1f2e]"
                  key={card.label}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f0c040]/70">
                    {card.label}
                  </p>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
                    {card.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[#888899]">
                    {card.text}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="relative z-10 mt-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#444455]">
              The Whole Team
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Yes, really. One person.
            </h2>

            <article className="card-shine mx-auto mt-8 max-w-2xl rounded-3xl border border-[#f0c040]/15 bg-[#1a1a24] p-6 text-left shadow-2xl shadow-black/30 sm:p-8">
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-[#f0c040]/25 bg-[#f0c040]/10 text-5xl font-bold text-[#f0c040] shadow-[0_0_48px_rgba(240,192,64,0.12)]">
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-2xl font-semibold tracking-tight text-white">
                    Parveen Siwach
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#f0c040]/85">
                    Founder, Designer, Developer, Support, Janitor
                  </p>
                  <p className="mt-1 text-sm text-[#888899]">
                    Rewari, Haryana
                  </p>
                </div>
              </div>
              <p className="mt-6 text-[15px] leading-8 text-[#d8d8df]">
                Built this entire platform alone. Codes at night, dreams bigger
                in the morning. Believes one determined person can change how a
                country thinks about giving.
              </p>
              <p className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-[#888899]">
                Has consumed dangerous amounts of chai building WeClout ☕
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    className="rounded-full border border-[#f0c040]/15 bg-[#f0c040]/10 px-3 py-1 text-xs font-medium text-[#f0c040]/90"
                    key={badge.id}
                  >
                    {badge.emoji} {badge.name}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <section className="relative z-10 mt-16">
            <div className="mb-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#444455]">
                By The Numbers
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5 text-center"
                  key={stat.label}
                >
                  <p className="text-4xl font-semibold tracking-tight text-[#f0c040]">
                    <CountUpStat
                      prefix={stat.prefix}
                      staticValue={stat.staticValue}
                      suffix={stat.suffix}
                      target={stat.target}
                    />
                  </p>
                  <p className="mt-2 text-[12px] uppercase tracking-widest text-[#888899]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-[#888899]">
              Everything you see was built by one person, for everyone.
            </p>
          </section>

          <section className="relative z-10 mt-16">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Say Hello
              </h2>
              <p className="mt-3 text-[#888899]">
                We read every message. Yes, personally.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {contacts.map((contact) => (
                <article
                  className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5"
                  key={contact.label}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#444455]">
                    {contact.label}
                  </p>
                  <p className="mt-4 text-lg font-semibold text-white">
                    {contact.value}
                  </p>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-[#888899]">
                    {contact.description}
                  </p>
                  <Link
                    className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#f0c040] px-4 text-sm font-semibold text-black transition hover:bg-[#ffe680]"
                    href={contact.href}
                    target={contact.href.startsWith("http") ? "_blank" : undefined}
                  >
                    {contact.button}
                  </Link>
                </article>
              ))}

              <article className="rounded-2xl border border-white/[0.08] bg-[#1a1a24] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#444455]">
                  Built with love in
                </p>
                <p className="mt-4 text-lg font-semibold text-white">
                  Rewari, Haryana, India 🇮🇳
                </p>
                <p className="mt-3 text-sm leading-6 text-[#888899]">
                  Proudly made in India. For India. And soon, for the world.
                </p>
              </article>
            </div>
          </section>

          <section className="relative z-10 mt-16 rounded-3xl border border-[#f0c040]/15 bg-[#f0c040]/[0.04] px-5 py-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Your clout. Their future.
            </h2>
            <p className="mt-5 text-sm text-[#888899]">
              <span className="gold-shimmer font-semibold">WeClout</span> — Est.
              2026
            </p>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
