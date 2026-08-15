"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  Crown,
  FileCode2,
  GitBranch,
  GitPullRequest,
  ListChecks,
  LoaderCircle,
  MessageSquareWarning,
  Radio,
  Terminal,
  X,
} from "lucide-react";

import { Bar, BarChart, DitherGradient, Sparkline } from "@/components/dither-kit";
import {
  ACTIVE_CANDIDATE_STATUSES,
  ACTIVE_RUN_STATUSES,
  CandidateStatusMark,
  RunStatusMark,
  formatDuration,
} from "./run-status";
import { cn } from "@/lib/utils";
import { AGENT_PROVIDERS } from "@/lib/fork/types";
import type {
  CandidateResult,
  CandidateScore,
  ForkEvent,
  ForkRun,
  ReviewFinding,
} from "@/lib/fork/types";

const EXECUTION_TRACES: Record<
  "preparing" | "coding" | "testing" | "reviewing" | "scoring",
  number[]
> = {
  preparing: [0, 12, 12],
  coding: [0, 12, 40, 40],
  testing: [0, 12, 40, 66, 66],
  reviewing: [0, 12, 40, 66, 82, 82],
  scoring: [0, 12, 40, 66, 82, 94, 94],
};

const EXECUTION_PHASE = {
  preparing: 1,
  coding: 2,
  testing: 3,
  reviewing: 4,
  scoring: 5,
} as const;

function isForkRun(value: unknown): value is ForkRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<ForkRun>;
  return typeof run.id === "string" && Array.isArray(run.candidates);
}

function parseApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function runRuntime(run: ForkRun, now: number): number {
  if (!run.startedAt) return 0;
  const end = run.finishedAt ? Date.parse(run.finishedAt) : now;
  return Math.max(0, end - Date.parse(run.startedAt));
}

function candidateRuntime(candidate: CandidateResult, now: number): number {
  if (!ACTIVE_CANDIDATE_STATUSES.has(candidate.status) || !candidate.startedAt) {
    return candidate.runtimeMs;
  }
  return Math.max(candidate.runtimeMs, now - Date.parse(candidate.startedAt));
}

function cleanLogLine(line: string): string {
  const clean = line.replaceAll(/\u001b\[[0-9;]*m/g, "").trim();
  try {
    const event = JSON.parse(clean) as Record<string, unknown>;
    const type = typeof event.type === "string" ? event.type : "event";
    if (type === "command.started") {
      return `$ ${String(event.command ?? event.name ?? "repository check")}`;
    }
    if (type === "command.output") return String(event.line ?? "");
    const item =
      event.item && typeof event.item === "object"
        ? (event.item as Record<string, unknown>)
        : undefined;
    if (item?.type === "agent_message" && typeof item.text === "string") return item.text;
    if (item?.type === "command_execution") {
      const command = typeof item.command === "string" ? item.command : "repository command";
      return `${type === "item.started" ? "$" : "↳"} ${command}`;
    }
    const message = [event.message, event.text, event.summary, item?.text].find(
      (value) => typeof value === "string" && value.trim(),
    );
    if (typeof message === "string") return message;
    return type.replaceAll(/[._-]/g, " ");
  } catch {
    return clean;
  }
}

function taskHeadline(task: string): string {
  const firstLine = task
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || task).replace(/^#+\s*/, "").replaceAll("`", "");
}

const ExecutionPulse = memo(function ExecutionPulse({
  status,
}: {
  status: CandidateResult["status"];
}) {
  if (!ACTIVE_CANDIDATE_STATUSES.has(status)) return null;
  const activeStatus = status as keyof typeof EXECUTION_TRACES;
  const phase = EXECUTION_PHASE[activeStatus];
  return (
    <div
      role="img"
      aria-label={`Live execution pulse: phase ${phase} of 5, ${activeStatus}.`}
      className="mt-2 w-28"
    >
      <div className="mb-1 flex items-center justify-between font-mono text-[8px] tracking-[0.08em] text-[#687178] uppercase">
        <span>Execution</span>
        <span className="tabular-nums text-[#aeb9c2]">0{phase}/05</span>
      </div>
      <div aria-hidden className="h-5 overflow-hidden border-y border-[#2a3034] bg-[#090a0b]">
        <Sparkline
          data={EXECUTION_TRACES[activeStatus]}
          color="grey"
          variant="dotted"
          animate
          bloom="off"
          className="opacity-80"
        />
      </div>
    </div>
  );
});

const SCORE_COMPONENTS = [
  ["tests", "Tests"],
  ["review", "Review"],
  ["simplicity", "Simplicity"],
  ["speed", "Speed"],
] as const;

const ScoreBreakdown = memo(function ScoreBreakdown({ score }: { score: CandidateScore }) {
  const rows = useMemo(
    () =>
      SCORE_COMPONENTS.map(([key, label]) => ({
        label,
        value: score[key],
      })),
    [score],
  );

  return (
    <div className="mt-3 max-w-sm">
      <p className="sr-only">
        Score breakdown: tests {Math.round(score.tests)}, review {Math.round(score.review)},
        simplicity {Math.round(score.simplicity)}, speed {Math.round(score.speed)}.
      </p>
      <div aria-hidden className="h-12">
        <BarChart
          data={rows}
          config={{ value: { label: "Score", color: "grey" } }}
          interactive={false}
          margins={{ top: 3, right: 3, bottom: 1, left: 3 }}
        >
          <Bar dataKey="value" variant="gradient" />
        </BarChart>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[8px] tracking-[0.1em] text-[#687178] uppercase">
        {SCORE_COMPONENTS.map(([key, label]) => (
          <span key={key} className="tabular-nums">
            {label} {Math.round(score[key])}
          </span>
        ))}
      </div>
    </div>
  );
});

function Finding({ finding }: { finding: ReviewFinding }) {
  return (
    <li className="grid gap-1 border-t border-[#262923] py-3 first:border-t-0 sm:grid-cols-[6rem_1fr] sm:gap-4">
      <span
        className={cn(
          "font-mono text-[9px] tracking-[0.1em] uppercase",
          finding.severity === "error"
            ? "text-[#ef9188]"
            : "text-[#aeb9c2]",
        )}
      >
        {finding.severity} · {finding.source}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#d3d6ce]">{finding.title}</p>
        <p className="mt-1 text-xs leading-5 text-[#7d8379]">{finding.body}</p>
        {finding.file && (
          <p className="mt-1.5 truncate font-mono text-[10px] text-[#5f655c]">
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </p>
        )}
      </div>
    </li>
  );
}

function Disclosure({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group min-w-0 border-t border-[#26292b] md:border-r md:last:border-r-0">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 font-mono text-[10px] tracking-[0.1em] text-[#858b8e] uppercase outline-none transition-colors hover:bg-[#101214] hover:text-[#c6c9cb] focus-visible:bg-[#121517] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#aeb9c2] [&::-webkit-details-marker]:hidden">
        {icon}
        <span>{label}</span>
        {count !== undefined && <span className="text-[#555b52]">{count}</span>}
        <ChevronDown
          aria-hidden
          className="ml-auto size-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-[#222520] bg-[#080908] p-4">{children}</div>
    </details>
  );
}

function CandidateRow({
  candidate,
  index,
  isWinner,
  now,
}: {
  candidate: CandidateResult;
  index: number;
  isWinner: boolean;
  now: number;
}) {
  const requiredChecks = candidate.commands.filter((command) => command.required);
  const passedChecks = requiredChecks.filter((command) => command.status === "passed").length;
  const score = candidate.score;
  const logLines = candidate.logs.map(cleanLogLine).filter(Boolean).slice(-100);

  return (
    <article
      data-candidate
      data-winner={isWinner || undefined}
      className={cn(
        "relative border-t border-[#2a2d30] bg-[#090a0b] first:border-t-0",
        isWinner && "bg-[#0c0e0f] shadow-[inset_2px_0_0_#aeb9c2]",
      )}
    >
      <div className="relative grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(5rem,0.55fr))_8rem] lg:items-center">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="font-mono text-[9px] text-[#555b52]">0{index + 1}</span>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[#e0e3db]">
              {candidate.label}
            </h2>
            {isWinner && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-[#aeb9c2] uppercase">
                <Crown aria-hidden className="size-3" /> Winner
              </span>
            )}
          </div>
          <p className="line-clamp-2 max-w-xl text-xs leading-5 text-[#737970]">
            {candidate.description}
          </p>
        </div>

        <dl className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:contents">
          <div>
            <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-[#5e645b] uppercase">
              Files
            </dt>
            <dd className="font-mono text-xs tabular-nums text-[#afb4aa]">
              {candidate.diffStats.filesChanged} · <span className="text-[#aeb9c2]">+{candidate.diffStats.additions}</span>{" "}
              <span className="text-[#858e94]">−{candidate.diffStats.deletions}</span>
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-[#5e645b] uppercase">
              Checks
            </dt>
            <dd className="font-mono text-xs tabular-nums text-[#afb4aa]">
              {requiredChecks.length ? `${passedChecks}/${requiredChecks.length}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-[#5e645b] uppercase">
              Score
            </dt>
            <dd
              className={cn(
                "font-mono text-xs tabular-nums text-[#afb4aa]",
                isWinner && "text-[#deded8]",
              )}
            >
              {score ? Math.round(score.total) : "—"}
              {score?.disqualified && <span className="ml-1 text-[9px] text-[#ef9188]">DQ</span>}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-[#5e645b] uppercase">
              Runtime
            </dt>
            <dd className="font-mono text-xs tabular-nums text-[#afb4aa]">
              {formatDuration(candidateRuntime(candidate, now))}
            </dd>
          </div>
        </dl>

        <div className="lg:justify-self-end">
          <CandidateStatusMark status={candidate.status} />
          <ExecutionPulse status={candidate.status} />
        </div>
      </div>

      {(requiredChecks.length > 0 || candidate.error) && (
        <div className="relative border-t border-[#222520] px-4 py-3 sm:px-5">
          {requiredChecks.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {requiredChecks.map((command) => (
                <li
                  key={`${command.name}-${command.command}`}
                  className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-[#757b72]"
                  title={command.command}
                >
                  {command.status === "passed" ? (
                    <Check aria-hidden className="size-3 text-[#aeb9c2]" />
                  ) : command.status === "failed" || command.status === "timed_out" ? (
                    <X aria-hidden className="size-3 text-[#ef9188]" />
                  ) : (
                    <CircleDot aria-hidden className="size-3" />
                  )}
                  <span className="max-w-56 truncate">{command.name}</span>
                </li>
              ))}
            </ul>
          )}
          {candidate.error && (
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-[#ef9188] first:mt-0">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {candidate.error}
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3">
        <Disclosure icon={<Terminal aria-hidden className="size-3.5" />} label="Logs" count={logLines.length}>
          {logLines.length ? (
            <ol className="max-h-80 space-y-2 overflow-auto overscroll-contain font-mono text-[10px] leading-5 text-[#8e9489] [scrollbar-color:#373b35_#080908]">
              {logLines.map((line, lineIndex) => (
                <li key={`${lineIndex}-${line.slice(0, 18)}`} className="grid grid-cols-[2rem_1fr] gap-2">
                  <span aria-hidden className="select-none text-right text-[#444940]">
                    {(lineIndex + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="min-w-0 break-words whitespace-pre-wrap">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs leading-5 text-[#666c63]">No agent output has been captured.</p>
          )}
        </Disclosure>

        <Disclosure
          icon={<FileCode2 aria-hidden className="size-3.5" />}
          label="Diff"
          count={candidate.diffStats.filesChanged}
        >
          {candidate.diff ? (
            <pre className="max-h-96 overflow-auto overscroll-contain font-mono text-[10px] leading-5 text-[#a5aaa0] [scrollbar-color:#373b35_#080908]">
              <code>{candidate.diff}</code>
            </pre>
          ) : (
            <p className="text-xs leading-5 text-[#666c63]">No diff has been captured.</p>
          )}
        </Disclosure>

        <Disclosure
          icon={<MessageSquareWarning aria-hidden className="size-3.5" />}
          label="Review"
          count={candidate.findings.length}
        >
          {candidate.findings.length ? (
            <ul>
              {candidate.findings.map((finding, findingIndex) => (
                <Finding
                  key={`${finding.source}-${finding.title}-${findingIndex}`}
                  finding={finding}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-5 text-[#666c63]">
              {candidate.status === "complete" ? "No review findings." : "Review pending."}
            </p>
          )}
        </Disclosure>
      </div>
    </article>
  );
}

export function RunDetail({ initialRun }: { initialRun: ForkRun }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(initialRun);
  const [connection, setConnection] = useState<"idle" | "connecting" | "live" | "closed">(
    ACTIVE_RUN_STATUSES.has(initialRun.status) ? "connecting" : "closed",
  );
  const [now, setNow] = useState(() => Date.now());
  const [openingPr, setOpeningPr] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const active = ACTIVE_RUN_STATUSES.has(run.status);

  useEffect(() => {
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-run-enter]",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            ease: "power4.out",
            stagger: 0.055,
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!run.winnerId) return;
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          '[data-winner="true"]',
          { x: -3 },
          { x: 0, duration: 0.45, ease: "power4.out", clearProps: "transform" },
        );
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, [run.winnerId]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const source = new EventSource(`/api/runs/${encodeURIComponent(run.id)}/events`);
    const handleMessage = (message: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(message.data) as ForkEvent | ForkRun;
        if (isForkRun(payload)) {
          setRun(payload);
          return;
        }
        if (payload.type === "run.updated") {
          setRun(payload.run);
          if (!ACTIVE_RUN_STATUSES.has(payload.run.status)) {
            setConnection("closed");
            source.close();
          }
        } else if (payload.type === "candidate.log") {
          setRun((current) => ({
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === payload.candidateId
                ? { ...candidate, logs: [...candidate.logs, payload.line].slice(-240) }
                : candidate,
            ),
          }));
        }
      } catch {
        // Ignore malformed proxy messages and keep the stream open.
      }
    };

    source.onopen = () => setConnection("live");
    source.onmessage = handleMessage;
    source.onerror = () => setConnection("connecting");
    return () => source.close();
  }, [active, run.id]);

  async function openWinningPr() {
    if (!run.winnerId || openingPr) return;
    if (run.prUrl) {
      window.open(run.prUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const pendingWindow = window.open("about:blank", "_blank");
    if (pendingWindow) pendingWindow.opener = null;
    setOpeningPr(true);
    setPrError(null);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(run.id)}/pr`, {
        method: "POST",
      });
      const payload = (await response.json()) as unknown;
      const payloadRun =
        payload && typeof payload === "object" && "run" in payload
          ? (payload as { run?: unknown }).run
          : undefined;
      const url =
        payload && typeof payload === "object" && "prUrl" in payload
          ? (payload as { prUrl?: unknown }).prUrl
          : undefined;
      if (!response.ok || typeof url !== "string") {
        throw new Error(
          parseApiError(payload, "The pull request could not be created. Verify GitHub access."),
        );
      }
      if (isForkRun(payloadRun)) setRun(payloadRun);
      else setRun((current) => ({ ...current, prUrl: url }));
      if (pendingWindow) pendingWindow.location.href = url;
      else window.location.assign(url);
    } catch (caught) {
      pendingWindow?.close();
      setPrError(
        caught instanceof Error
          ? caught.message
          : "The pull request could not be created. Verify GitHub access.",
      );
    } finally {
      setOpeningPr(false);
    }
  }

  const winner = run.candidates.find((candidate) => candidate.id === run.winnerId);
  const headline = taskHeadline(run.request.task);
  const hasTaskDetail = headline !== run.request.task.trim();
  const provider = AGENT_PROVIDERS.find(
    (candidate) => candidate.id === (run.request.agentProvider ?? "codex"),
  );
  const compression = run.supercompress;

  return (
    <div ref={rootRef} className="pb-12">
      <div data-run-enter className="flex items-center justify-between border-b border-[#272a2c] py-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-8 items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-[#858b8e] uppercase outline-none hover:text-[#e8eae8] focus-visible:ring-2 focus-visible:ring-[#aeb9c2]"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> All runs
        </Link>
        <div className="flex items-center gap-3">
          {connection === "live" && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-[#8c979f] uppercase">
              <Radio aria-hidden className="size-3 text-[#aeb9c2]" /> Live
            </span>
          )}
          {connection === "connecting" && (
            <span className="font-mono text-[9px] tracking-[0.1em] text-[#777d73] uppercase">
              Reconnecting
            </span>
          )}
          <span className="font-mono text-[10px] tabular-nums text-[#60665d]">
            {formatDuration(runRuntime(run, now))}
          </span>
        </div>
      </div>

      <header data-run-enter className="grid gap-5 py-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <RunStatusMark status={run.status} />
            <span aria-hidden className="text-[#3f443d]">/</span>
            <span className="max-w-full truncate font-mono text-[10px] text-[#666c63]" title={run.id}>
              {run.id}
            </span>
          </div>
          <h1 className="line-clamp-5 max-w-3xl text-[clamp(1.5rem,3vw,2.4rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-[#f0f1ed]">
            {headline}
          </h1>
          {hasTaskDetail && (
            <details className="group mt-3 max-w-3xl">
              <summary className="flex min-h-7 w-fit cursor-pointer list-none items-center gap-1.5 font-mono text-[10px] tracking-[0.09em] text-[#747a7d] uppercase outline-none hover:text-[#d8dadb] focus-visible:ring-2 focus-visible:ring-[#aeb9c2] [&::-webkit-details-marker]:hidden">
                Full task
                <ChevronDown
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="mt-3 whitespace-pre-wrap border-l border-[#33372f] pl-4 text-xs leading-5 text-[#858b80]">
                {run.request.task}
              </p>
            </details>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#747a7d]">
            <span className="inline-flex max-w-full items-center gap-1.5">
              <GitBranch aria-hidden className="size-3.5 shrink-0" />
              <span className="break-all font-mono">{run.sourcePath ?? run.request.repository}</span>
            </span>
            {run.baseBranch && (
              <span className="font-mono">base: {run.baseBranch}</span>
            )}
          </div>
        </div>

        <div className="border-l border-[#2a2d28] pl-4">
          <p className="font-mono text-[9px] tracking-[0.13em] text-[#5f655c] uppercase">
            Execution model
          </p>
          <dl className="mt-2 space-y-2 font-mono text-[10px] leading-4">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#666d70]">Agent</dt>
              <dd className="text-[#c4c8c7]">{provider?.label ?? "Codex"} × 3</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#666d70]">Context</dt>
              <dd className="text-right text-[#c4c8c7]">
                {compression?.status === "compressed"
                  ? `SuperCompress −${Math.round(compression.tokensSavedPct ?? 0)}%${compression.mcpReady ? " + MCP" : ""}`
                  : compression?.status === "unavailable"
                    ? "Compression unavailable"
                    : compression?.status === "pending"
                      ? "Compressing"
                      : "Uncompressed"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#666d70]">Isolation</dt>
              <dd className="text-[#c4c8c7]">3 worktrees</dd>
            </div>
          </dl>
        </div>
      </header>

      {winner && (
        <section
          data-run-enter
          aria-labelledby="winner-heading"
          className="relative mb-4 grid border-y border-[#384047] bg-[#0c0e0f] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <DitherGradient from="grey" direction="up" cell={2} opacity={0.16} />
          <div className="relative px-4 py-4 sm:px-5">
            <p className="mb-1.5 flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-[#aeb9c2] uppercase">
              <Crown aria-hidden className="size-3.5" /> Selected winner
            </p>
            <h2 id="winner-heading" className="text-lg font-semibold text-[#e9ede2]">
              {winner.label}
              {winner.score && (
                <span className="ml-2 font-mono text-xs font-normal tabular-nums text-[#aeb9c2]">
                  {Math.round(winner.score.total)}/100
                </span>
              )}
            </h2>
            {run.judge?.rationale && (
              <p className="mt-2 max-w-4xl text-xs leading-5 text-[#92998b]">
                {run.judge.rationale}
              </p>
            )}
            {winner.score && <ScoreBreakdown score={winner.score} />}
          </div>
          <div className="relative border-t border-[#384047] p-3.5 sm:border-t-0 sm:border-l sm:p-4">
            {run.prUrl ? (
              <a
                href={run.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#deded8] px-4 text-sm font-semibold text-[#121313] outline-none transition-colors hover:bg-[#c9cdd0] focus-visible:ring-2 focus-visible:ring-[#aeb9c2] sm:w-auto"
              >
                <GitPullRequest aria-hidden className="size-4" /> Open winning PR
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={openWinningPr}
                disabled={openingPr}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#deded8] px-4 text-sm font-semibold text-[#121313] outline-none transition-colors hover:bg-[#c9cdd0] focus-visible:ring-2 focus-visible:ring-[#aeb9c2] disabled:pointer-events-none disabled:opacity-45 sm:w-auto"
              >
                {openingPr ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <GitPullRequest aria-hidden className="size-4" />
                )}
                {openingPr ? "Preparing PR" : "Open winning PR"}
              </button>
            )}
          </div>
        </section>
      )}

      {prError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 border border-[#553431] bg-[#17100f] px-3 py-2.5 text-xs leading-5 text-[#ef9b92]"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{prError}</span>
        </div>
      )}

      {run.error && (
        <div
          data-run-enter
          role="alert"
          className="mb-5 flex items-start gap-2 border border-[#553431] bg-[#17100f] px-3 py-2.5 text-xs leading-5 text-[#ef9b92]"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{run.error}</span>
        </div>
      )}

      <section data-run-enter aria-labelledby="candidate-results-heading">
        <div className="flex items-center justify-between border-y border-[#272a25] px-1 py-3">
          <h2
            id="candidate-results-heading"
            className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.15em] text-[#a1a69c] uppercase"
          >
            <Code2 aria-hidden className="size-3.5" /> Candidate evidence
          </h2>
          <span className="hidden items-center gap-1.5 font-mono text-[9px] text-[#555b52] sm:flex">
            <ListChecks aria-hidden className="size-3" /> Tests · review · simplicity · speed
          </span>
        </div>
        <div className="border-b border-[#2a2d28]">
          {run.candidates.map((candidate, index) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              index={index}
              isWinner={candidate.id === run.winnerId}
              now={now}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
