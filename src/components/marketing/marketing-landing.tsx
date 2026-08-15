"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import {
  ArrowRight,
  GitBranch,
  GitPullRequest,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { Bar, BarChart, DitherGradient } from "@/components/dither-kit";
import { BrandMark } from "./brand-mark";
import { TrajectoryVisual } from "./trajectory-visual";

const steps = [
  {
    number: "01",
    title: "Fork",
    body: "Create three isolated Git worktrees and give each strategy the same task.",
    icon: GitBranch,
  },
  {
    number: "02",
    title: "Prove",
    body: "Run the same required checks, inspect every diff, and surface review findings.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Decide",
    body: "Weight correctness, review, simplicity, and speed. Let evidence select the winner.",
    icon: Scale,
  },
  {
    number: "04",
    title: "Publish",
    body: "Open the winning branch as a pull request only when you choose.",
    icon: GitPullRequest,
  },
] as const;

const weights: { label: string; weight: number }[] = [
  { label: "Tests", weight: 50 },
  { label: "Review", weight: 30 },
  { label: "Simplicity", weight: 10 },
  { label: "Speed", weight: 10 },
];

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "group inline-flex min-h-12 items-center justify-center gap-2 border border-[#e8e4dc] bg-[#e8e4dc] px-5 text-sm font-semibold text-[#111214] transition-[background-color,transform] duration-150 hover:bg-[#dcd8cf] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
          : "group inline-flex min-h-12 items-center justify-center gap-2 border border-[#383d42] bg-[#0c0e10] px-5 text-sm font-medium text-[#dedbd4] transition-[border-color,background-color,transform] duration-150 hover:border-[#69737b] hover:bg-[#121519] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
      }
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

export function MarketingLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });
        timeline
          .fromTo(
            "[data-hero-reveal]",
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.075 },
          )
          .fromTo(
            "[data-trajectory]",
            { autoAlpha: 0, x: -10 },
            { autoAlpha: 1, x: 0, duration: 0.58, stagger: 0.09 },
            "-=0.38",
          )
          .fromTo(
            "[data-evidence]",
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.4 },
            "-=0.2",
          )
          .fromTo(
            "[data-winner]",
            { autoAlpha: 0, scale: 0.96, transformOrigin: "center" },
            { autoAlpha: 1, scale: 1, duration: 0.48 },
            "-=0.15",
          );

        const revealGroups = gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]");
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              observer.unobserve(entry.target);
              gsap.fromTo(
                entry.target.querySelectorAll("[data-reveal-item]"),
                { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.64, stagger: 0.07, ease: "power4.out" },
              );
            });
          },
          { threshold: 0.14 },
        );
        revealGroups.forEach((group) => observer.observe(group));

        gsap.to("[data-hero-visual]", {
          y: -44,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count ?? "0");
          if (!Number.isFinite(target)) return;
          el.textContent = "0";
          const proxy = { value: 0 };
          gsap.to(proxy, {
            value: target,
            duration: 1.1,
            ease: "power3.out",
            snap: { value: 1 },
            scrollTrigger: { trigger: el, start: "top 88%" },
            onUpdate: () => {
              el.textContent = String(Math.round(proxy.value));
            },
          });
        });

        return () => observer.disconnect();
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-dvh overflow-x-hidden bg-[#090a0c] text-[#ece9e2] selection:bg-[#aeb9c2] selection:text-[#111214]"
      style={{ colorScheme: "dark" }}
    >
      <section data-hero className="relative min-h-svh border-b border-[#25292d]">
        <DitherGradient from="grey" direction="up" cell={3} opacity={0.14} />
        <header data-hero-reveal className="relative z-20 px-5 sm:px-8 lg:px-12">
          <nav
            aria-label="Primary navigation"
            className="mx-auto flex h-20 max-w-[1500px] items-center justify-between border-b border-[#22262a]"
          >
            <Link
              href="/"
              aria-label="FORK home"
              className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
            >
              <BrandMark className="size-9" />
              <span className="text-base font-bold tracking-[0.18em] text-[#ece9e2]">FORK</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-[#a1a5a8] transition-colors duration-150 hover:text-[#ece9e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2] sm:px-4"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center gap-2 border border-[#e8e4dc] bg-[#e8e4dc] px-3 text-sm font-semibold text-[#111214] transition-colors duration-150 hover:bg-[#dcd8cf] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2] sm:px-4"
              >
                Start running
                <ArrowRight aria-hidden className="hidden size-4 sm:block" />
              </Link>
            </div>
          </nav>
        </header>

        <main
          id="main-content"
          className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:gap-12 lg:px-12 lg:py-12"
        >
          <div className="max-w-[700px] lg:pb-10">
            <h1
              data-hero-reveal
              className="max-w-[13ch] text-[clamp(2.6rem,5.3vw,4.7rem)] leading-[0.95] font-semibold tracking-[-0.052em] text-[#ece9e2]"
            >
              Speculative execution for coding agents.
            </h1>
            <p
              data-hero-reveal
              className="mt-6 max-w-[36rem] text-base leading-7 text-[#989da1] sm:text-lg sm:leading-8"
            >
              Run multiple implementations. Test every branch. Ship the best one.
            </p>
            <div data-hero-reveal className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ActionLink href="/dashboard" primary>
                Start running
              </ActionLink>
              <ActionLink href="/sign-in">Sign in</ActionLink>
            </div>
          </div>

          <div data-hero-reveal className="relative -mx-5 sm:mx-0 lg:translate-y-5">
            <div data-hero-visual className="will-change-transform">
              <TrajectoryVisual />
            </div>
          </div>

        </main>
      </section>

      <section
        id="workflow"
        data-scroll-reveal
        aria-labelledby="workflow-heading"
        className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8 sm:py-26 lg:px-12 lg:py-34"
      >
        <div className="grid gap-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-28">
          <div data-reveal-item className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-4 font-mono text-[10px] font-medium tracking-[0.2em] text-[#8f989f] uppercase">
              The workflow
            </p>
            <h2
              id="workflow-heading"
              className="max-w-[13ch] text-[clamp(2.15rem,3.8vw,3.4rem)] leading-[1] font-semibold tracking-[-0.045em] text-[#e9e6df]"
            >
              Parallel by design. Deterministic by default.
            </h2>
            <p className="mt-6 max-w-[34rem] text-base leading-7 text-[#92979b]">
              FORK does not reward the first agent to finish. Every candidate crosses the same verification boundary before a winner is chosen.
            </p>
          </div>

          <div className="border-t border-[#33383d]">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  data-reveal-item
                  className="grid gap-4 border-b border-[#33383d] py-6 sm:grid-cols-[56px_1fr_auto] sm:items-start sm:gap-7 sm:py-8"
                >
                  <span className="font-mono text-xs tabular-nums tracking-[0.14em] text-[#717980]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#e3e0da] sm:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[38rem] text-base leading-7 text-[#8f959a]">
                      {step.body}
                    </p>
                  </div>
                  <Icon aria-hidden className="size-5 text-[#7b848b] sm:mt-1" />
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-20 grid border-y border-[#33383d] lg:mt-28 lg:grid-cols-[0.72fr_1.28fr]">
          <div data-reveal-item className="border-b border-[#33383d] py-6 lg:border-r lg:border-b-0 lg:py-8 lg:pr-12">
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#899299] uppercase">Decision weights</p>
            <p className="mt-4 max-w-[24rem] text-base leading-7 text-[#b9bdc0]">
              Required checks are a gate, not a vanity score.
            </p>
          </div>
          <div data-reveal-item className="py-6 sm:py-8 lg:pl-8">
            <div aria-hidden className="h-44 sm:h-48">
              <BarChart
                data={weights}
                config={{ weight: { label: "Weight", color: "grey" } }}
                interactive={false}
                animate
                margins={{ top: 6, right: 6, bottom: 2, left: 6 }}
              >
                <Bar dataKey="weight" variant="gradient" />
              </BarChart>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
              {weights.map(({ label, weight }) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] tracking-[0.15em] text-[#777f85] uppercase">{label}</dt>
                  <dd className="mt-1.5 font-mono text-3xl tracking-[-0.05em] text-[#dedbd5] tabular-nums">
                    <span data-count={weight}>{weight}</span><span className="ml-1 text-xs text-[#697177]">%</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section
        data-scroll-reveal
        aria-labelledby="final-cta-heading"
        className="relative border-y border-[#2b3034] bg-[#0c0e10]"
      >
        <DitherGradient from="grey" direction="up" cell={3} opacity={0.22} />
        <div className="relative mx-auto grid max-w-[1500px] gap-8 px-5 py-16 sm:px-8 sm:py-22 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-28">
          <div data-reveal-item>
            <h2
              id="final-cta-heading"
              className="max-w-[15ch] text-[clamp(2.35rem,4.5vw,4rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-[#e9e6df]"
            >
              The first answer is no longer the default.
            </h2>
          </div>
          <div data-reveal-item className="flex flex-col items-start gap-4 lg:items-end">
            <ActionLink href="/dashboard" primary>
              Start running
            </ActionLink>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center text-sm text-[#92979b] underline decoration-[#4d5358] underline-offset-4 transition-colors hover:text-[#dedbd4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2]"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#25292d] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-8 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            aria-label="FORK home"
            className="inline-flex min-h-11 items-center gap-3 self-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
          >
            <BrandMark />
            <span className="text-sm font-bold tracking-[0.18em] text-[#dedbd5]">FORK</span>
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7e858a]">
            <Link className="min-h-11 content-center transition-colors hover:text-[#dedbd4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2]" href="/sign-in">
              Sign in
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dedbd4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2]" href="/dashboard">
              Start running
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dedbd4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2]" href="/privacy">
              Privacy
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dedbd4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#aeb9c2]" href="/terms">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
