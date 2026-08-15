import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CandidateStatus, RunStatus } from "@/lib/fork/types";

export const ACTIVE_RUN_STATUSES = new Set<RunStatus>([
  "queued",
  "preparing",
  "running",
  "evaluating",
]);

export const ACTIVE_CANDIDATE_STATUSES = new Set<CandidateStatus>([
  "preparing",
  "coding",
  "testing",
  "reviewing",
  "scoring",
]);

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  queued: "Queued",
  preparing: "Preparing",
  running: "Running",
  evaluating: "Evaluating",
  complete: "Complete",
  failed: "Failed",
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  queued: "Waiting",
  preparing: "Preparing",
  coding: "Building",
  testing: "Testing",
  reviewing: "Reviewing",
  scoring: "Scoring",
  complete: "Complete",
  failed: "Failed",
  timed_out: "Timed out",
};

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "—";
  const seconds = Math.floor(milliseconds / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${(seconds % 60).toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}

export function RunStatusMark({ status, compact = false }: { status: RunStatus; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-[#92978e] uppercase",
        status === "complete" && "text-[#aeb9c2]",
        status === "failed" && "text-[#ef9188]",
      )}
      role="status"
    >
      {status === "complete" ? (
        <CheckCircle2 aria-hidden className="size-3.5" />
      ) : status === "failed" ? (
        <AlertTriangle aria-hidden className="size-3.5" />
      ) : (
        <LoaderCircle
          aria-hidden
          className="size-3.5 animate-spin motion-reduce:animate-none"
        />
      )}
      {!compact && RUN_STATUS_LABELS[status]}
      <span className={compact ? "sr-only" : "hidden"}>{RUN_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function CandidateStatusMark({ status }: { status: CandidateStatus }) {
  const active = ACTIVE_CANDIDATE_STATUSES.has(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-[#8e938a] uppercase",
        status === "complete" && "text-[#aeb9c2]",
        (status === "failed" || status === "timed_out") && "text-[#ef9188]",
      )}
      role="status"
    >
      {status === "complete" ? (
        <Check aria-hidden className="size-3.5" />
      ) : status === "failed" || status === "timed_out" ? (
        <X aria-hidden className="size-3.5" />
      ) : active ? (
        <LoaderCircle
          aria-hidden
          className="size-3.5 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Clock3 aria-hidden className="size-3.5" />
      )}
      {CANDIDATE_STATUS_LABELS[status]}
    </span>
  );
}
