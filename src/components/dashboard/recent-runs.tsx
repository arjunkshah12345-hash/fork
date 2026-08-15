import Link from "next/link";
import { ArrowRight, GitBranch, History, Trophy } from "lucide-react";

import { RunStatusMark, formatDuration } from "./run-status";
import type { ForkRun } from "@/lib/fork/types";

function repositoryName(repository: string): string {
  const normalized = repository.replaceAll("\\", "/").replace(/\/$/, "");
  return normalized.split("/").pop() || repository;
}

function runRuntime(run: ForkRun): number {
  if (!run.startedAt) return 0;
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();
  return Math.max(0, end - Date.parse(run.startedAt));
}

function createdLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function taskHeadline(task: string): string {
  const firstLine = task
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || task).replace(/^#+\s*/, "").replaceAll("`", "");
}

export function RecentRuns({ runs, unavailable = false }: { runs: ForkRun[]; unavailable?: boolean }) {
  return (
    <section data-dashboard-enter aria-labelledby="recent-runs-heading" className="pt-14 pb-16 sm:pt-20">
      <div className="mb-3 flex items-center justify-between border-b border-[#272a25] pb-3">
        <div className="flex items-center gap-2.5">
          <History aria-hidden className="size-3.5 text-[#777d73]" />
          <h2
            id="recent-runs-heading"
            className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#a1a69c] uppercase"
          >
            Recent runs
          </h2>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-[#5f655c]">
          {runs.length.toString().padStart(2, "0")}
        </span>
      </div>

      {unavailable ? (
        <div className="border-b border-[#272a25] py-10" role="alert">
          <p className="text-sm font-medium text-[#d6d9d1]">Run history is unavailable.</p>
          <p className="mt-2 max-w-lg text-xs leading-5 text-[#757b72]">
            Verify that this server can read <span className="font-mono">.fork/runs</span>, then
            refresh the page. New runs can still be composed above.
          </p>
        </div>
      ) : runs.length === 0 ? (
        <div className="border-b border-[#272a25] py-12 sm:grid sm:grid-cols-[1fr_1fr] sm:gap-10">
          <p className="text-lg font-medium tracking-[-0.02em] text-[#dfe2da]">No runs yet.</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#747a71] sm:mt-0">
            Point Fork at a local Git repository and describe the outcome you need. The first run
            will appear here as soon as its worktrees are queued.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-[#222520] border-b border-[#272a25]">
          {runs.slice(0, 12).map((run) => {
            const winner = run.candidates.find((candidate) => candidate.id === run.winnerId);
            const complete = run.candidates.filter((candidate) => candidate.status === "complete").length;
            return (
              <li key={run.id}>
                <Link
                  href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                  className="group grid min-h-20 gap-3 py-4 outline-none transition-colors hover:bg-[#0d0f0c] focus-visible:bg-[#10120f] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c7ff42] sm:grid-cols-[minmax(0,1fr)_8rem_7rem_1.5rem] sm:items-center sm:px-3"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#747a71]">
                      <GitBranch aria-hidden className="size-3" />
                      <span className="truncate font-mono">{repositoryName(run.request.repository)}</span>
                      <span aria-hidden className="text-[#424740]">/</span>
                      <time className="shrink-0 font-mono" dateTime={run.createdAt}>
                        {createdLabel(run.createdAt)}
                      </time>
                    </div>
                    <p className="line-clamp-2 text-sm leading-5 font-medium text-[#d8dbd3] sm:truncate">
                      {taskHeadline(run.request.task)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:block">
                    <RunStatusMark status={run.status} />
                    <span className="font-mono text-[10px] text-[#60665d] sm:mt-1 sm:block">
                      {complete}/3 candidates
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#70766d] sm:block sm:text-right">
                    {winner ? (
                      <span className="inline-flex items-center gap-1.5 text-[#aab29f]">
                        <Trophy aria-hidden className="size-3 text-[#c7ff42]" />
                        {winner.label}
                      </span>
                    ) : (
                      <span>Decision pending</span>
                    )}
                    <span className="tabular-nums sm:mt-1 sm:block">
                      {formatDuration(runRuntime(run))}
                    </span>
                  </div>

                  <ArrowRight
                    aria-hidden
                    className="hidden size-3.5 text-[#535950] transition-transform group-hover:translate-x-0.5 group-hover:text-[#c7ff42] sm:block"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
