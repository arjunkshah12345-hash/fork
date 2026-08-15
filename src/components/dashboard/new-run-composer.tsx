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
import { AGENT_PROVIDERS, type AgentProvider, type ForkRun } from "@/lib/fork/types";

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
  const [agentProvider, setAgentProvider] = useState<AgentProvider>("codex");
  const [useSupercompress, setUseSupercompress] = useState(true);
  const [pending, setPending] = useState<"run" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function launch(endpoint: "/api/runs" | "/api/demo") {
    setPending(endpoint === "/api/demo" ? "demo" : "run");
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          endpoint === "/api/runs"
            ? JSON.stringify({
                repository: repository.trim(),
                task: task.trim(),
                agentProvider,
                useSupercompress,
              })
            : JSON.stringify({ agentProvider, useSupercompress }),
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
    <section data-dashboard-enter aria-labelledby="new-run-heading" className="pt-6 sm:pt-8">
      <div className="mb-5 max-w-3xl">
        <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-[#777d73] uppercase">
          Three worktrees · one decision
        </p>
        <h1
          id="new-run-heading"
          className="text-[clamp(1.9rem,4vw,3rem)] leading-[1] font-semibold tracking-[-0.045em] text-[#f0f1ed]"
        >
          Run the task three ways.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#8b9092]">
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
          <div className="border-b border-[#242728] p-3.5 sm:p-4 lg:border-r lg:border-b-0">
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
              className="h-10 rounded-sm border-[#35383a] bg-[#080909] px-3 font-mono text-sm text-[#e4e5e1] placeholder:text-[#62676a] focus-visible:border-[#aeb9c2] focus-visible:ring-[#aeb9c2]/20"
            />
            <p className="mt-2 text-[11px] leading-4 text-[#60665d]">
              Use a local Git path or a cloneable Git URL.
            </p>
          </div>

          <div className="p-3.5 sm:p-4">
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
              className="min-h-20 resize-y rounded-sm border-[#35383a] bg-[#080909] px-3 py-2 text-sm leading-6 text-[#e4e5e1] placeholder:text-[#62676a] focus-visible:border-[#aeb9c2] focus-visible:ring-[#aeb9c2]/20"
            />
          </div>
        </div>

        <div className="grid border-t border-[#242728] lg:grid-cols-[minmax(0,1fr)_18rem]">
          <fieldset className="border-b border-[#242728] px-3.5 py-3 sm:px-4 lg:border-r lg:border-b-0">
            <legend className="sr-only">Agent provider</legend>
            <div className="mb-2.5 flex items-center justify-between gap-4">
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#858b80] uppercase">
                Agent runtime
              </span>
              <span className="font-mono text-[9px] text-[#5f6568]">Applies to all 3</span>
            </div>
            <div className="grid grid-cols-2 border border-[#303438] sm:grid-cols-4">
              {AGENT_PROVIDERS.map((provider, index) => {
                const interactive = provider.automation === "interactive";
                const selected = agentProvider === provider.id;
                return (
                  <label
                    key={provider.id}
                    aria-disabled={interactive}
                    title={
                      interactive
                        ? "Freebuff has no supported unattended mode yet."
                        : provider.description
                    }
                    className={`relative flex min-h-11 items-center justify-between gap-2 px-3 text-xs transition-colors ${
                      index > 0 ? "border-l border-[#303438]" : ""
                    } ${
                      interactive
                        ? "cursor-not-allowed text-[#555b5e]"
                        : "cursor-pointer hover:bg-[#111315]"
                    } ${selected ? "bg-[#171a1c] text-[#eef0ed]" : "text-[#949a9d]"}`}
                  >
                    <input
                      type="radio"
                      name="agentProvider"
                      value={provider.id}
                      checked={selected}
                      onChange={() => setAgentProvider(provider.id)}
                      disabled={pending !== null || interactive}
                      className="sr-only"
                    />
                    <span className="font-medium">{provider.label}</span>
                    {interactive ? (
                      <span className="font-mono text-[8px] tracking-[0.08em] uppercase">Interactive</span>
                    ) : selected ? (
                      <span aria-hidden className="size-1.5 bg-[#b8c2ca]" />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 px-3.5 py-3 sm:px-4">
            <input
              type="checkbox"
              name="useSupercompress"
              checked={useSupercompress}
              onChange={(event) => setUseSupercompress(event.target.checked)}
              disabled={pending !== null}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="mt-0.5 grid size-4 shrink-0 place-items-center border border-[#4a5054] text-[10px] text-transparent peer-checked:border-[#aeb9c2] peer-checked:bg-[#d9ddd9] peer-checked:text-[#111315] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#aeb9c2]"
            >
              ✓
            </span>
            <span>
              <span className="block text-xs font-medium text-[#d4d7d5]">SuperCompress</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#686f72]">
                Compress shared repo context, then use MCP during each run.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#242728] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => launch("/api/demo")}
              disabled={pending !== null}
              className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-[#a8adaf] underline decoration-[#4c5154] underline-offset-4 transition-colors hover:text-[#edefec] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2] disabled:pointer-events-none disabled:opacity-40"
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#deded8] px-5 text-sm font-semibold text-[#121313] transition-colors hover:bg-[#c9cdd0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2] disabled:pointer-events-none disabled:opacity-35"
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
