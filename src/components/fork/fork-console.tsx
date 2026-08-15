"use client";

import { FormEvent, KeyboardEvent, memo, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Command,
  Crown,
  FileCode2,
  FlaskConical,
  GitBranch,
  GitFork,
  GitPullRequest,
  LoaderCircle,
  Play,
  Terminal,
  X,
} from "lucide-react";

import { DitherButton, Sparkline } from "@/components/dither-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STRATEGIES } from "@/lib/fork/types";
import type {
  CandidateResult,
  CandidateStatus,
  ForkEvent,
  ForkRun,
  RunStatus,
} from "@/lib/fork/types";

const ACTIVE_CANDIDATE_STATUSES = new Set<CandidateStatus>([
  "preparing",
  "coding",
  "testing",
  "reviewing",
  "scoring",
]);

const CANDIDATE_STATUS: Record<CandidateStatus, string> = {
  queued: "Waiting",
  preparing: "Preparing",
  coding: "Building",
  testing: "Verifying",
  reviewing: "Reviewing",
  scoring: "Scoring",
  complete: "Complete",
  failed: "Failed",
  timed_out: "Timed out",
};

const RUN_STATUS: Record<RunStatus, string> = {
  queued: "Queued",
  preparing: "Preparing worktrees",
  running: "Candidates running",
  evaluating: "Selecting winner",
  complete: "Run complete",
  failed: "Run failed",
};

const STATUS_PROGRESS: Record<CandidateStatus, number> = {
  queued: 0,
  preparing: 12,
  coding: 40,
  testing: 66,
  reviewing: 80,
  scoring: 92,
  complete: 100,
  failed: 100,
  timed_out: 100,
};

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "—";
  const seconds = Math.floor(milliseconds / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}

function liveRuntime(candidate: CandidateResult, now: number): number {
  if (!ACTIVE_CANDIDATE_STATUSES.has(candidate.status) || !candidate.startedAt) {
    return candidate.runtimeMs;
  }
  return Math.max(candidate.runtimeMs, now - Date.parse(candidate.startedAt));
}

function cleanText(value: string): string {
  return value
    .replaceAll(/\u001b\[[0-9;]*m/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function logText(line: string): string | null {
  const raw = cleanText(line);
  if (!raw) return null;
  if (
    raw.includes("[ad]  Earning Kickback") ||
    raw.includes("codex_models_manager::cache") ||
    raw.includes("codex_core_skills::loader") ||
    raw.includes("codex_core_plugins::manifest") ||
    raw.includes("rmcp::transport::worker")
  ) {
    return null;
  }

  try {
    const event = JSON.parse(raw) as Record<string, unknown>;
    const type = typeof event.type === "string" ? event.type : "";
    if (type === "command.started") {
      return `Running ${String(event.name ?? event.command ?? "required check")}`;
    }
    if (type === "command.output") return null;

    const item =
      event.item && typeof event.item === "object"
        ? (event.item as Record<string, unknown>)
        : undefined;
    if (type === "thread.started") return "Codex session started";
    if (type === "turn.started") return "Planning implementation";
    if (type === "turn.completed") return "Implementation complete";
    if (item?.type === "command_execution") {
      if (type === "item.started") return "Running repository command";
      const exitCode = typeof item.exit_code === "number" ? item.exit_code : null;
      return exitCode === 0 ? "Repository command passed" : "Repository command finished";
    }
    const candidate = [
      event.message,
      event.summary,
      event.text,
      event.output,
      item?.text,
      item?.summary,
      item?.message,
    ].find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof candidate === "string") return cleanText(candidate);
    if (type) return cleanText(type.replaceAll(/[._-]/g, " "));
  } catch {
    return raw;
  }

  return raw;
}

function conciseProgress(candidate: CandidateResult | undefined): string[] {
  if (!candidate) return [];
  const items = candidate.logs
    .map(logText)
    .filter((item): item is string => Boolean(item))
    .filter((item, index, all) => item !== all[index - 1]);
  if (candidate.agentSummary) items.push(cleanText(candidate.agentSummary));
  return items.slice(-4);
}

function isForkRun(value: unknown): value is ForkRun {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ForkRun>;
  return typeof candidate.id === "string" && Array.isArray(candidate.candidates);
}

function parseApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}

function RunStatusIcon({ status }: { status: RunStatus }) {
  if (status === "complete") return <CheckCircle2 aria-hidden className="size-3.5" />;
  if (status === "failed") return <AlertTriangle aria-hidden className="size-3.5" />;
  return <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />;
}

function CandidateStatusIcon({ status }: { status: CandidateStatus }) {
  if (status === "complete") return <Check aria-hidden className="size-3.5" />;
  if (status === "failed" || status === "timed_out") {
    return <X aria-hidden className="size-3.5" />;
  }
  if (ACTIVE_CANDIDATE_STATUSES.has(status)) {
    return <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />;
  }
  return <Clock3 aria-hidden className="size-3.5" />;
}

const ScoreSignal = memo(function ScoreSignal({ candidate }: { candidate?: CandidateResult }) {
  const active = candidate ? ACTIVE_CANDIDATE_STATUSES.has(candidate.status) : false;
  const score = candidate?.score;
  const data = score
    ? [
        0,
        score.tests * 0.5,
        score.tests * 0.5 + score.review * 0.3,
        score.tests * 0.5 + score.review * 0.3 + score.simplicity * 0.1,
        score.total,
      ]
    : active
      ? [8, 28, 18, 46, 32, 64, 49, 82]
      : [0, 0, 0, 0, 0];

  if (!active && !candidate?.score) {
    return <div className="h-11 border-y border-[#20231f] bg-[#0a0b0a]" />;
  }

  return (
    <div
      className="relative h-11 overflow-hidden border-y border-[#252a21] bg-[#0a0c09]"
      aria-label={active ? "Live agent activity" : "Cumulative weighted score"}
    >
      <Sparkline
        data={data}
        color="green"
        variant="dotted"
        animate={active}
        className="opacity-75"
      />
      <span className="pointer-events-none absolute right-2 bottom-1 font-mono text-[9px] tracking-[0.18em] text-[#77806d] uppercase">
        {active ? "Live activity" : "Weighted profile"}
      </span>
    </div>
  );
});

function EmptyMetric({ children }: { children: string }) {
  return <p className="text-xs leading-5 text-[#666b63]">{children}</p>;
}

function CandidateLane({
  candidate,
  index,
  isWinner,
  now,
  onOpenPr,
  openingPr,
}: {
  candidate?: CandidateResult;
  index: number;
  isWinner: boolean;
  now: number;
  onOpenPr: () => void;
  openingPr: boolean;
}) {
  const strategy = STRATEGIES[index];
  const status = candidate?.status ?? "queued";
  const progress = conciseProgress(candidate);
  const requiredChecks = candidate?.commands.filter((command) => command.required) ?? [];
  const files = candidate?.diffStats.files ?? [];
  const findings = candidate?.findings ?? [];
  const score = candidate?.score;
  const active = ACTIVE_CANDIDATE_STATUSES.has(status);

  return (
    <article
      data-entrance
      data-candidate={strategy.id}
      data-winner={isWinner ? "true" : "false"}
      className={cn(
        "relative flex min-h-[620px] w-[calc(100vw-2rem)] shrink-0 snap-center flex-col overflow-hidden border border-[#232522] bg-[#0c0d0c] sm:w-[78vw] lg:min-h-[650px] lg:w-auto lg:min-w-0",
        isWinner && "border-[#819f37] bg-[#0f110d]",
      )}
    >
      {active && (
        <div
          data-scan
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-[#c7ff42] opacity-0"
        />
      )}

      <header className="relative min-h-32 px-4 pt-4 pb-5 sm:px-5">
        {isWinner && (
          <div data-crown className="mb-4 flex items-center justify-between text-[#c7ff42]">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
              <Crown aria-hidden className="size-3.5" /> Winner
            </span>
            <span className="h-px flex-1 bg-[#60772b] ml-3" />
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#656a62] uppercase">
              Candidate {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#f0f2ec]">
              {strategy.label}
            </h2>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-sm border-[#30332e] bg-[#101210] px-2 font-mono text-[10px] tracking-[0.08em] text-[#9ba196] uppercase",
              active && "border-[#536427] text-[#c7ff42]",
              isWinner && "border-[#819f37] bg-[#1a2110] text-[#c7ff42]",
              (status === "failed" || status === "timed_out") &&
                "border-[#613936] text-[#f09389]",
            )}
          >
            <CandidateStatusIcon status={status} />
            {CANDIDATE_STATUS[status]}
          </Badge>
        </div>
        <p className="mt-3 max-w-[38ch] text-xs leading-5 text-[#8b9087]">
          {strategy.description}
        </p>
      </header>

      <ScoreSignal candidate={candidate} />

      <div className="flex flex-1 flex-col divide-y divide-[#20221f]">
        <section className="px-4 py-4 sm:px-5" aria-label={`${strategy.label} progress`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-mono text-[10px] tracking-[0.17em] text-[#73786f] uppercase">
              <Terminal aria-hidden className="size-3" /> Agent progress
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-[#656b60]">
              {STATUS_PROGRESS[status]}%
            </span>
          </div>
          <div className="mb-3 h-px bg-[#292c27]">
            <div
              className={cn(
                "h-px bg-[#696e65] transition-[width] duration-300 motion-reduce:transition-none",
                active && "bg-[#c7ff42]",
                isWinner && "bg-[#c7ff42]",
              )}
              style={{ width: `${STATUS_PROGRESS[status]}%` }}
            />
          </div>
          {progress.length > 0 ? (
            <ol className="space-y-2">
              {progress.map((item, itemIndex) => (
                <li
                  key={`${itemIndex}-${item}`}
                  className="flex gap-2.5 text-xs leading-5 text-[#a2a79d]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-[9px] size-1 shrink-0 bg-[#555a52]",
                      itemIndex === progress.length - 1 && active && "bg-[#c7ff42]",
                    )}
                  />
                  <span className="line-clamp-2 break-words">{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyMetric>
              {candidate ? "Waiting for the first agent event." : "Agent events will stream here."}
            </EmptyMetric>
          )}
          {candidate?.error && (
            <p className="mt-3 border border-[#4f302e] bg-[#1a1110] px-3 py-2 text-xs leading-5 text-[#ef9c93]">
              {candidate.error}
            </p>
          )}
        </section>

        <section className="grid grid-cols-2 divide-x divide-[#20221f]">
          <div className="min-w-0 px-4 py-4 sm:px-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.17em] text-[#73786f] uppercase">
              <FileCode2 aria-hidden className="size-3" /> Files
            </h3>
            {files.length > 0 ? (
              <>
                <p className="mb-2 font-mono text-xs tabular-nums text-[#d9ddd3]">
                  {candidate?.diffStats.filesChanged} changed
                  <span className="ml-2 text-[#74815e]">
                    +{candidate?.diffStats.additions} −{candidate?.diffStats.deletions}
                  </span>
                </p>
                <ul className="space-y-1.5">
                  {files.slice(0, 3).map((file) => (
                    <li key={file} className="truncate font-mono text-[10px] text-[#898f84]" title={file}>
                      {file}
                    </li>
                  ))}
                  {files.length > 3 && (
                    <li className="font-mono text-[10px] text-[#60655d]">+{files.length - 3} more</li>
                  )}
                </ul>
              </>
            ) : (
              <EmptyMetric>No diff yet.</EmptyMetric>
            )}
          </div>

          <div className="min-w-0 px-4 py-4 sm:px-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.17em] text-[#73786f] uppercase">
              <FlaskConical aria-hidden className="size-3" /> Required checks
            </h3>
            {requiredChecks.length > 0 ? (
              <ul className="space-y-2">
                {requiredChecks.slice(0, 4).map((check) => (
                  <li key={`${check.name}-${check.command}`} className="flex min-w-0 items-center gap-2">
                    {check.status === "passed" ? (
                      <Check aria-hidden className="size-3 shrink-0 text-[#c7ff42]" />
                    ) : check.status === "failed" || check.status === "timed_out" ? (
                      <X aria-hidden className="size-3 shrink-0 text-[#ef8f86]" />
                    ) : (
                      <Clock3 aria-hidden className="size-3 shrink-0 text-[#777d73]" />
                    )}
                    <span className="truncate text-xs text-[#a2a79d]" title={check.command}>
                      {check.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMetric>
                {candidate?.status === "complete" ? "No required checks." : "Not run yet."}
              </EmptyMetric>
            )}
          </div>
        </section>

        <section className="px-4 py-4 sm:px-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.17em] text-[#73786f] uppercase">
            <AlertTriangle aria-hidden className="size-3" /> Findings
            {findings.length > 0 && (
              <span className="ml-auto tabular-nums text-[#a4aa9f]">{findings.length}</span>
            )}
          </h3>
          {findings.length > 0 ? (
            <ul className="space-y-3">
              {findings.slice(0, 2).map((finding, findingIndex) => (
                <li key={`${finding.source}-${finding.title}-${findingIndex}`} className="grid grid-cols-[4px_1fr] gap-2.5">
                  <span
                    aria-label={finding.severity}
                    className={cn(
                      "mt-1.5 h-3 bg-[#62675f]",
                      finding.severity === "warning" && "bg-[#c6a650]",
                      finding.severity === "error" && "bg-[#e77870]",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#c4c8bf]">{finding.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#767b73]">
                      {finding.body}
                    </p>
                    {(finding.file || finding.source) && (
                      <p className="mt-1.5 truncate font-mono text-[9px] tracking-[0.08em] text-[#5f655b] uppercase">
                        {finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""} · ` : ""}
                        {finding.source}
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {findings.length > 2 && (
                <li className="font-mono text-[10px] text-[#666c62]">+{findings.length - 2} more findings</li>
              )}
            </ul>
          ) : (
            <EmptyMetric>
              {candidate?.status === "complete" ? "No findings." : "Review pending."}
            </EmptyMetric>
          )}
        </section>
      </div>

      <footer className={cn("border-t border-[#292c27] bg-[#090a09] px-4 py-4 sm:px-5", isWinner && "bg-[#11150d]") }>
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.18em] text-[#656a61] uppercase">Weighted score</p>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className={cn("text-3xl tracking-[-0.08em] text-[#dfe2da]", isWinner && "text-[#c7ff42]") }>
                {score ? Math.round(score.total) : "—"}
              </span>
              <span className="text-[10px] text-[#5e635b]">/100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.18em] text-[#656a61] uppercase">Runtime</p>
            <p className="mt-1.5 font-mono text-xs tabular-nums text-[#b7bbb2]">
              {candidate ? formatDuration(liveRuntime(candidate, now)) : "—"}
            </p>
          </div>
        </div>

        {score && (
          <dl className="mt-4 grid grid-cols-4 gap-px bg-[#252824]">
            {[
              ["Tests", score.tests, "50%"],
              ["Review", score.review, "30%"],
              ["Simple", score.simplicity, "10%"],
              ["Speed", score.speed, "10%"],
            ].map(([label, value, weight]) => (
              <div key={label} className="bg-[#0d0f0d] px-2 py-2">
                <dt className="truncate font-mono text-[8px] tracking-[0.12em] text-[#5f655c] uppercase">
                  {label} · {weight}
                </dt>
                <dd className="mt-1 font-mono text-[11px] tabular-nums text-[#aeb3a8]">
                  {Math.round(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {isWinner && (
          <Button
            type="button"
            onClick={onOpenPr}
            disabled={openingPr}
            className="mt-4 h-11 w-full rounded-sm bg-[#c7ff42] text-sm font-semibold text-[#11130d] hover:bg-[#b8ef3a] focus-visible:border-[#efffbd] focus-visible:ring-[#c7ff42]/40"
          >
            {openingPr ? (
              <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <GitPullRequest aria-hidden />
            )}
            {openingPr ? "Preparing pull request" : "Open winning PR"}
            {!openingPr && <ArrowUpRight aria-hidden className="ml-auto" />}
          </Button>
        )}
      </footer>
    </article>
  );
}

export function ForkConsole() {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [repository, setRepository] = useState("");
  const [task, setTask] = useState("");
  const [run, setRun] = useState<ForkRun | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [connection, setConnection] = useState<"idle" | "connecting" | "live" | "closed">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [openingPr, setOpeningPr] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const runStatus = run?.status;
  const streamRunId =
    run && run.status !== "complete" && run.status !== "failed" ? run.id : null;
  const activeCandidateKey = run?.candidates.map((candidate) => candidate.status).join("|") ?? "";
  const inFlight =
    submitting ||
    runStatus === "queued" ||
    runStatus === "preparing" ||
    runStatus === "running" ||
    runStatus === "evaluating";

  useEffect(() => {
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-shell-entrance]",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.62, ease: "power4.out", stagger: 0.07 },
        );
        gsap.fromTo(
          "[data-entrance]",
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.12, ease: "power4.out", stagger: 0.08 },
        );
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!run?.winnerId) return;
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          '[data-winner="true"]',
          { scale: 0.987 },
          { scale: 1, duration: 0.55, ease: "power4.out" },
        );
        gsap.fromTo(
          "[data-crown]",
          { autoAlpha: 0, y: -8 },
          { autoAlpha: 1, y: 0, duration: 0.45, delay: 0.08, ease: "power4.out" },
        );
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, [run?.winnerId]);

  useEffect(() => {
    if (!inFlight) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [inFlight]);

  useEffect(() => {
    if (!streamRunId) return;
    const source = new EventSource(`/api/runs/${encodeURIComponent(streamRunId)}/events`);

    const applyEvent = (message: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(message.data) as ForkEvent | ForkRun;
        if (isForkRun(payload)) {
          setRun(payload);
          return;
        }
        if (payload.type === "run.updated") {
          setRun(payload.run);
          if (payload.run.status === "complete" || payload.run.status === "failed") {
            setConnection("closed");
            source.close();
          }
          return;
        }
        if (payload.type === "candidate.log") {
          setRun((current) => {
            if (!current || current.id !== payload.runId) return current;
            return {
              ...current,
              candidates: current.candidates.map((candidate) =>
                candidate.id === payload.candidateId
                  ? { ...candidate, logs: [...candidate.logs, payload.line].slice(-250) }
                  : candidate,
              ),
            };
          });
        }
      } catch {
        // Ignore malformed heartbeat/proxy messages; the stream remains usable.
      }
    };

    source.onopen = () => setConnection("live");
    source.onmessage = applyEvent;
    source.addEventListener("run.updated", applyEvent as EventListener);
    source.addEventListener("candidate.log", applyEvent as EventListener);
    source.onerror = () => setConnection("connecting");

    return () => {
      source.close();
    };
  }, [streamRunId]);

  useEffect(() => {
    if (!inFlight) return;
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const scans = gsap.utils.toArray<HTMLElement>("[data-scan]");
        scans.forEach((scan, index) => {
          const lane = scan.closest<HTMLElement>("[data-candidate]");
          if (!lane) return;
          gsap.fromTo(
            scan,
            { y: 0, autoAlpha: 0 },
            {
              y: Math.max(0, lane.offsetHeight - 1),
              autoAlpha: 0.24,
              duration: 3.2 + index * 0.18,
              delay: index * 0.16,
              ease: "none",
              repeat: -1,
              repeatDelay: 0.7,
            },
          );
        });
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, [activeCandidateKey, inFlight]);

  async function start(endpoint: "/api/runs" | "/api/demo") {
    setSubmitting(true);
    setRequestError(null);
    setOpeningPr(false);
    setConnection("connecting");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: endpoint === "/api/runs" ? { "Content-Type": "application/json" } : undefined,
        body:
          endpoint === "/api/runs"
            ? JSON.stringify({ repository: repository.trim(), task: task.trim() })
            : undefined,
      });
      const payload = (await response.json()) as unknown;
      const nextRun =
        payload && typeof payload === "object" && "run" in payload
          ? (payload as { run?: unknown }).run
          : payload;
      if (!response.ok || !isForkRun(nextRun)) {
        throw new Error(parseApiError(payload, "The run could not be started. Check the repository and try again."));
      }
      setRun(nextRun);
      setNow(Date.now());
    } catch (error) {
      setConnection("idle");
      setRequestError(
        error instanceof Error
          ? error.message
          : "The run could not be started. Check the repository and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repository.trim() || !task.trim() || inFlight) return;
    await start("/api/runs");
  }

  function handleTaskKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  async function openWinningPr() {
    if (!run || !run.winnerId || openingPr) return;
    if (run.prUrl) {
      window.open(run.prUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const pendingWindow = window.open("about:blank", "_blank");
    if (pendingWindow) pendingWindow.opener = null;
    setOpeningPr(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(run.id)}/pr`, { method: "POST" });
      const payload = (await response.json()) as {
        url?: unknown;
        prUrl?: unknown;
        error?: unknown;
      };
      const url = typeof payload.prUrl === "string" ? payload.prUrl : payload.url;
      if (!response.ok || typeof url !== "string") {
        throw new Error(parseApiError(payload, "The pull request could not be created. Try again."));
      }
      setRun((current) => (current ? { ...current, prUrl: url } : current));
      if (pendingWindow) pendingWindow.location.href = url;
      else window.location.assign(url);
    } catch (error) {
      pendingWindow?.close();
      setRequestError(
        error instanceof Error ? error.message : "The pull request could not be created. Try again.",
      );
    } finally {
      setOpeningPr(false);
    }
  }

  const runRuntime = run?.startedAt
    ? (run.finishedAt ? Date.parse(run.finishedAt) : now) - Date.parse(run.startedAt)
    : 0;

  return (
    <div
      ref={rootRef}
      className="min-h-dvh bg-[#070807] text-[#eef0ea] selection:bg-[#c7ff42] selection:text-[#10120d]"
      style={{ colorScheme: "dark" }}
    >
      <a
        href="#execution"
        className="fixed top-2 left-2 z-50 -translate-y-16 bg-[#c7ff42] px-3 py-2 text-sm font-semibold text-[#11130d] focus:translate-y-0 focus:outline-none"
      >
        Skip to execution
      </a>

      <header data-shell-entrance className="border-b border-[#232522] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center border border-[#41453d] bg-[#0d0f0c]">
              <GitFork aria-hidden className="size-3.5 text-[#c7ff42]" />
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-bold tracking-[0.16em] text-[#f0f2ec]">FORK</span>
              <span className="hidden font-mono text-[9px] tracking-[0.2em] text-[#62675f] uppercase sm:inline">
                Speculative execution
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-[#747a70] uppercase">
            <span className="size-1.5 bg-[#c7ff42]" aria-hidden />
            Local orchestrator
          </div>
        </div>
      </header>

      <main id="execution" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section data-shell-entrance aria-labelledby="run-heading" className="mb-8 lg:mb-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#70766c] uppercase">
                Three branches · one decision
              </p>
              <h1 id="run-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#f0f2ec] sm:text-3xl">
                Speculative execution for coding agents.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#858b81] sm:text-right">
              Run multiple implementations. Test every branch. Ship the best one.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="border border-[#292c27] bg-[#0c0d0c]"
          >
            <div className="grid lg:grid-cols-[minmax(250px,0.72fr)_minmax(420px,1.6fr)_auto]">
              <div className="border-b border-[#252724] p-4 lg:border-r lg:border-b-0">
                <label htmlFor="repository" className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-[#7c8277] uppercase">
                  <GitBranch aria-hidden className="size-3" /> Repository
                </label>
                <Input
                  id="repository"
                  name="repository"
                  required
                  autoComplete="off"
                  value={repository}
                  onChange={(event) => setRepository(event.target.value)}
                  disabled={inFlight}
                  placeholder="/path/to/repository or Git URL"
                  className="h-11 rounded-sm border-[#31342f] bg-[#080908] px-3 text-base text-[#e7e9e2] placeholder:text-[#666b63] focus-visible:border-[#9cc834] focus-visible:ring-[#c7ff42]/20 md:text-base"
                />
              </div>

              <div className="border-b border-[#252724] p-4 lg:border-r lg:border-b-0">
                <label htmlFor="task" className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-[#7c8277] uppercase">
                  <Code2 aria-hidden className="size-3" /> Task
                </label>
                <Textarea
                  id="task"
                  name="task"
                  required
                  rows={2}
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                  onKeyDown={handleTaskKeyDown}
                  disabled={inFlight}
                  placeholder="Describe the change, constraints, and acceptance criteria…"
                  className="min-h-[72px] resize-none rounded-sm border-[#31342f] bg-[#080908] px-3 py-2.5 text-base leading-6 text-[#e7e9e2] placeholder:text-[#666b63] focus-visible:border-[#9cc834] focus-visible:ring-[#c7ff42]/20 md:text-base"
                />
              </div>

              <div className="flex min-w-52 flex-col justify-between gap-3 p-4">
                <DitherButton
                  type="submit"
                  color="green"
                  variant="dotted"
                  disabled={inFlight || !repository.trim() || !task.trim()}
                  className="h-11 w-full rounded-sm border border-[#89aa38] bg-[#10130d] text-sm font-semibold tracking-normal text-[#f2ffd7] focus-visible:ring-2 focus-visible:ring-[#c7ff42]"
                >
                  <span className="flex items-center justify-center gap-2">
                    {inFlight ? (
                      <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Play aria-hidden className="size-4 fill-current" />
                    )}
                    {inFlight ? "Run in progress" : "Fork this task"}
                  </span>
                </DitherButton>
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => start("/api/demo")}
                    disabled={inFlight}
                    className="min-h-8 text-left text-xs font-medium text-[#a4aa9f] underline decoration-[#4e534b] underline-offset-4 transition-colors hover:text-[#dfe3d9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff42] disabled:pointer-events-none disabled:opacity-40"
                  >
                    Run demo
                  </button>
                  <span className="hidden items-center gap-1 font-mono text-[9px] text-[#596057] xl:flex">
                    <Command aria-hidden className="size-2.5" />↵
                  </span>
                </div>
              </div>
            </div>
          </form>

          {requestError && (
            <div role="alert" className="mt-3 flex items-start gap-2 border border-[#4f302e] bg-[#17100f] px-3 py-2.5 text-xs leading-5 text-[#ef9c93]">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>{requestError}</span>
            </div>
          )}
        </section>

        <section data-shell-entrance aria-labelledby="candidates-heading">
          <div className="mb-3 flex min-h-8 items-center justify-between gap-4 border-y border-[#20221f] py-2">
            <div className="flex min-w-0 items-center gap-3">
              <h2 id="candidates-heading" className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#9da398] uppercase">
                Candidate execution
              </h2>
              {run && (
                <span className="hidden max-w-56 truncate font-mono text-[9px] text-[#555b52] sm:inline" title={run.id}>
                  {run.id}
                </span>
              )}
            </div>

            {run ? (
              <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] tracking-[0.08em] uppercase">
                <span
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "flex items-center gap-1.5 text-[#8c9287]",
                    run.status === "complete" && "text-[#c7ff42]",
                    run.status === "failed" && "text-[#ef8f86]",
                  )}
                >
                  <RunStatusIcon status={run.status} />
                  {RUN_STATUS[run.status]}
                </span>
                <span className="hidden text-[#4c514a] sm:inline">/</span>
                <span className="hidden tabular-nums text-[#747a70] sm:inline">{formatDuration(runRuntime)}</span>
                {connection === "live" && (
                  <span className="hidden items-center gap-1.5 text-[#77806d] md:flex">
                    <span className="size-1 bg-[#c7ff42]" aria-hidden /> Live
                  </span>
                )}
              </div>
            ) : (
              <p className="font-mono text-[9px] tracking-[0.1em] text-[#5f655c] uppercase">Ready for a task</p>
            )}
          </div>

          {run?.judge?.rationale && (
            <div className="mb-3 grid border border-[#455323] bg-[#0f120c] p-4 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-4">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.15em] text-[#c7ff42] uppercase sm:mb-0">
                <Crown aria-hidden className="size-3.5" /> Judge decision
              </div>
              <p className="text-xs leading-5 text-[#aeb5a5]">{run.judge.rationale}</p>
            </div>
          )}

          <div className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-color:#383c35_#0a0b0a] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-2 lg:overflow-visible lg:px-0">
            <div className="flex snap-x snap-mandatory gap-2 lg:contents">
              {STRATEGIES.map((strategy, index) => (
                <CandidateLane
                  key={strategy.id}
                  candidate={run?.candidates.find((candidate) => candidate.id === strategy.id)}
                  index={index}
                  isWinner={run?.winnerId === strategy.id}
                  now={now}
                  onOpenPr={openWinningPr}
                  openingPr={openingPr}
                />
              ))}
            </div>
          </div>

          {!run && (
            <p className="mt-2 flex items-center gap-2 text-xs leading-5 text-[#666c63]">
              <Terminal aria-hidden className="size-3" /> Each strategy gets an isolated worktree, the same task, and the same required checks.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
