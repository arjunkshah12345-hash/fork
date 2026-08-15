"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  ArrowDown,
  ArrowRight,
  Check,
  GitBranch,
  GitPullRequest,
  Scale,
  ShieldCheck,
} from "lucide-react";

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
          ? "group inline-flex min-h-12 items-center justify-center gap-2 border border-[#c7ff45] bg-[#c7ff45] px-5 text-sm font-semibold text-[#10130d] transition-[background-color,transform] duration-150 hover:bg-[#b9f038] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff45]"
          : "group inline-flex min-h-12 items-center justify-center gap-2 border border-[#363c33] bg-[#0b0e0b] px-5 text-sm font-medium text-[#e5e9e0] transition-[border-color,background-color,transform] duration-150 hover:border-[#697263] hover:bg-[#10130f] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff45]"
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
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.075 },
          )
          .fromTo(
            "[data-trajectory]",
            { autoAlpha: 0, x: -14 },
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

        gsap.to("[data-winner-signal]", {
          autoAlpha: 0.32,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut",
        });

        const revealGroups = gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]");
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              observer.unobserve(entry.target);
              gsap.fromTo(
                entry.target.querySelectorAll("[data-reveal-item]"),
                { autoAlpha: 0, y: 20 },
                { autoAlpha: 1, y: 0, duration: 0.64, stagger: 0.07, ease: "power4.out" },
              );
            });
          },
          { threshold: 0.14 },
        );
        revealGroups.forEach((group) => observer.observe(group));
        return () => observer.disconnect();
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-dvh overflow-x-hidden bg-[#080a08] text-[#eef2e9] selection:bg-[#c7ff45] selection:text-[#10130d]"
      style={{ colorScheme: "dark" }}
    >
      <section className="relative min-h-svh border-b border-[#242923]">
        <header data-hero-reveal className="relative z-20 px-5 sm:px-8 lg:px-12">
          <nav
            aria-label="Primary navigation"
            className="mx-auto flex h-20 max-w-[1500px] items-center justify-between border-b border-[#20241f]"
          >
            <Link
              href="/"
              aria-label="FORK home"
              className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff45]"
            >
              <BrandMark className="size-9" />
              <span className="text-base font-bold tracking-[0.18em] text-[#f3f6ef]">FORK</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-[#aeb5aa] transition-colors duration-150 hover:text-[#f1f4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7ff45] sm:px-4"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center gap-2 border border-[#c7ff45] bg-[#c7ff45] px-3 text-sm font-semibold text-[#10130d] transition-colors duration-150 hover:bg-[#b9f038] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45] sm:px-4"
              >
                Start running
                <ArrowRight aria-hidden className="hidden size-4 sm:block" />
              </Link>
            </div>
          </nav>
        </header>

        <main
          id="main-content"
          className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:gap-16 lg:px-12 lg:py-16"
        >
          <div className="max-w-[700px] lg:pb-10">
            <div data-hero-reveal className="mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[#c7ff45]" aria-hidden />
              <p className="font-mono text-[10px] font-medium tracking-[0.22em] text-[#98a38f] uppercase">
                Parallel search for better code
              </p>
            </div>
            <h1
              data-hero-reveal
              className="max-w-[11ch] text-[clamp(3.25rem,7vw,7.1rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-[#f2f5ee]"
            >
              Speculative execution for coding agents.
            </h1>
            <p
              data-hero-reveal
              className="mt-8 max-w-[39rem] text-lg leading-8 text-[#9ea69b] sm:mt-10 sm:text-xl sm:leading-9"
            >
              Run multiple implementations. Test every branch. Ship the best one.
            </p>
            <div data-hero-reveal className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ActionLink href="/dashboard" primary>
                Start running
              </ActionLink>
              <ActionLink href="/sign-in">Sign in</ActionLink>
            </div>
            <p data-hero-reveal className="mt-8 flex items-center gap-2 text-sm leading-6 text-[#768073]">
              <Check aria-hidden className="size-4 text-[#c7ff45]" />
              Three isolated worktrees. One evidence-based winner.
            </p>
          </div>

          <div data-hero-reveal className="relative -mx-5 sm:mx-0 lg:translate-y-5">
            <TrajectoryVisual />
          </div>

          <a
            href="#workflow"
            data-hero-reveal
            className="absolute bottom-5 left-5 hidden min-h-11 items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-[#667062] uppercase transition-colors hover:text-[#aab3a5] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45] sm:flex lg:left-12"
          >
            See the method <ArrowDown aria-hidden className="size-3.5" />
          </a>
        </main>
      </section>

      <section
        id="workflow"
        data-scroll-reveal
        aria-labelledby="workflow-heading"
        className="mx-auto max-w-[1500px] px-5 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-48"
      >
        <div className="grid gap-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-28">
          <div data-reveal-item className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-5 font-mono text-[10px] font-medium tracking-[0.22em] text-[#93a08a] uppercase">
              The workflow
            </p>
            <h2
              id="workflow-heading"
              className="max-w-[11ch] text-[clamp(2.5rem,5vw,5.4rem)] leading-[0.95] font-semibold tracking-[-0.06em] text-[#edf1e8]"
            >
              Parallel by design. Deterministic by default.
            </h2>
            <p className="mt-8 max-w-[34rem] text-base leading-7 text-[#8e978a] sm:text-lg sm:leading-8">
              FORK does not reward the first agent to finish. Every candidate crosses the same verification boundary before a winner is chosen.
            </p>
          </div>

          <div className="border-t border-[#30362e]">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  data-reveal-item
                  className="grid gap-5 border-b border-[#30362e] py-8 sm:grid-cols-[64px_1fr_auto] sm:items-start sm:gap-8 sm:py-10"
                >
                  <span className="font-mono text-xs tabular-nums tracking-[0.14em] text-[#657061]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.035em] text-[#e8ece4] sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[38rem] text-base leading-7 text-[#8d9689]">
                      {step.body}
                    </p>
                  </div>
                  <Icon aria-hidden className="size-5 text-[#7d8877] sm:mt-1" />
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-28 grid border-y border-[#30362e] lg:mt-40 lg:grid-cols-[0.72fr_1.28fr]">
          <div data-reveal-item className="border-b border-[#30362e] py-8 lg:border-r lg:border-b-0 lg:py-10 lg:pr-12">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#87947e] uppercase">Decision weights</p>
            <p className="mt-5 max-w-[24rem] text-lg leading-8 text-[#c2c8bd]">
              Required checks are a gate, not a vanity score.
            </p>
          </div>
          <dl data-reveal-item className="grid grid-cols-2 sm:grid-cols-4">
            {[
              ["50", "Tests"],
              ["30", "Review"],
              ["10", "Simplicity"],
              ["10", "Speed"],
            ].map(([weight, label], index) => (
              <div
                key={label}
                className={`py-8 pl-0 sm:py-10 lg:pl-8 ${index > 0 ? "border-l border-[#252a23] pl-5" : ""}`}
              >
                <dt className="font-mono text-[10px] tracking-[0.16em] text-[#737e6f] uppercase">{label}</dt>
                <dd className="mt-3 font-mono text-4xl tracking-[-0.06em] text-[#e5e9e1] tabular-nums">
                  {weight}<span className="ml-1 text-sm text-[#626c5e]">%</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        data-scroll-reveal
        aria-labelledby="final-cta-heading"
        className="relative border-y border-[#2a3028] bg-[#0b0e0b]"
      >
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.035]">
          <defs>
            <pattern id="final-dither" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="#c7ff45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#final-dither)" />
        </svg>
        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-40">
          <div data-reveal-item>
            <p className="mb-5 font-mono text-[10px] tracking-[0.22em] text-[#91a087] uppercase">
              One task. Three shots.
            </p>
            <h2
              id="final-cta-heading"
              className="max-w-[13ch] text-[clamp(2.8rem,6vw,6.6rem)] leading-[0.92] font-semibold tracking-[-0.065em] text-[#f0f3ec]"
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
              className="inline-flex min-h-11 items-center text-sm text-[#8f988b] underline decoration-[#4b5348] underline-offset-4 transition-colors hover:text-[#e3e7de] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45]"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#242923] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            aria-label="FORK home"
            className="inline-flex min-h-11 items-center gap-3 self-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff45]"
          >
            <BrandMark />
            <span className="text-sm font-bold tracking-[0.18em] text-[#e6eae2]">FORK</span>
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7c8678]">
            <Link className="min-h-11 content-center transition-colors hover:text-[#dfe4da] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45]" href="/sign-in">
              Sign in
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dfe4da] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45]" href="/dashboard">
              Start running
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dfe4da] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45]" href="/privacy">
              Privacy
            </Link>
            <Link className="min-h-11 content-center transition-colors hover:text-[#dfe4da] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff45]" href="/terms">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
