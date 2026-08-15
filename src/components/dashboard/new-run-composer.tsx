"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Command,
  GitBranch,
  LoaderCircle,
  Play,
  TerminalSquare,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ForkRun } from "@/lib/fork/types";

function isForkRun(value: unknown): value is ForkRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<ForkRun>;
  return typeof run.id === "string" && Array.isArray(run.candidates);
}

function apiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function NewRunComposer() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [repository, setRepository] = useState("");
  const [task, setTask] = useState("");
  const [pending, setPending] = useState<"run" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function launch(endpoint: "/api/runs" | "/api/demo") {
    setPending(endpoint === "/api/demo" ? "demo" : "run");
    setError(null);
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
      const candidate =
        payload && typeof payload === "object" && "run" in payload
          ? (payload as { run?: unknown }).run
          : payload;
      if (!response.ok || !isForkRun(candidate)) {
        throw new Error(
          apiError(payload, "The run could not be started. Verify the repository and retry."),
        );
      }
      router.push(`/dashboard/runs/${encodeURIComponent(candidate.id)}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The run could not be started. Verify the repository and retry.",
      );
      setPending(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repository.trim() || !task.trim() || pending) return;
    await launch("/api/runs");
  }

  function handleTaskKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <section data-dashboard-enter aria-labelledby="new-run-heading" className="pt-8 sm:pt-12">
      <div className="mb-7 max-w-3xl">
        <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-[#777d73] uppercase">
          Three worktrees · one decision
        </p>
        <h1
          id="new-run-heading"
          className="text-[clamp(2rem,5vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.055em] text-[#f0f2ec]"
        >
          Run the task three ways.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-[#888e83] sm:text-base">
          Fork isolates three implementation strategies, verifies every branch, and gives you one
          evidence-backed winner.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border-y border-[#2a2d28] bg-[#0a0b0a]"
      >
        <div className="grid lg:grid-cols-[minmax(16rem,0.8fr)_minmax(24rem,1.5fr)]">
          <div className="border-b border-[#242723] p-4 sm:p-5 lg:border-r lg:border-b-0">
            <label
              htmlFor="dashboard-repository"
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[#858b80] uppercase"
            >
              <GitBranch aria-hidden className="size-3.5" /> Repository
            </label>
            <Input
              id="dashboard-repository"
              name="repository"
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
              placeholder="/absolute/path or https://github.com/owner/repo.git"
              autoComplete="off"
              required
              disabled={pending !== null}
              className="h-11 rounded-sm border-[#353832] bg-[#070807] px-3 font-mono text-sm text-[#e4e7df] placeholder:text-[#5f655c] focus-visible:border-[#8eb52f] focus-visible:ring-[#c7ff42]/20"
            />
            <p className="mt-2 text-[11px] leading-4 text-[#60665d]">
              Use a local Git path or a cloneable Git URL.
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <label
              htmlFor="dashboard-task"
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[#858b80] uppercase"
            >
              <TerminalSquare aria-hidden className="size-3.5" /> Engineering task
            </label>
            <Textarea
              id="dashboard-task"
              name="task"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              onKeyDown={handleTaskKeyDown}
              placeholder="Describe the change, constraints, and acceptance criteria…"
              rows={3}
              required
              disabled={pending !== null}
              className="min-h-24 resize-y rounded-sm border-[#353832] bg-[#070807] px-3 py-2.5 text-base leading-6 text-[#e4e7df] placeholder:text-[#5f655c] focus-visible:border-[#8eb52f] focus-visible:ring-[#c7ff42]/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#242723] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => launch("/api/demo")}
              disabled={pending !== null}
              className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-[#a8ada3] underline decoration-[#4c5149] underline-offset-4 transition-colors hover:text-[#edf0e8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ff42] disabled:pointer-events-none disabled:opacity-40"
            >
              {pending === "demo" ? (
                <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Play aria-hidden className="size-3.5" />
              )}
              {pending === "demo" ? "Preparing demo" : "Launch demo run"}
            </button>
            <span className="hidden items-center gap-1.5 font-mono text-[9px] text-[#555b52] sm:flex">
              <Command aria-hidden className="size-3" /> + Enter
            </span>
          </div>
          <button
            type="submit"
            disabled={pending !== null || !repository.trim() || !task.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#c7ff42] px-5 text-sm font-semibold text-[#11140d] transition-colors hover:bg-[#b8ef3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efffbd] disabled:pointer-events-none disabled:opacity-35"
          >
            {pending === "run" ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <ArrowRight aria-hidden className="size-4" />
            )}
            {pending === "run" ? "Starting run" : "Start parallel run"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 border border-[#553431] bg-[#17100f] px-3 py-2.5 text-xs leading-5 text-[#ef9b92]"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
