"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
} from "lucide-react";

const SUPERCOMPRESS_DASHBOARD_URL = "https://supercompress.dev";

interface SupercompressSetupProps {
  linked: boolean;
  linkedAt?: string | null;
}

export function SupercompressSetup({ linked, linkedAt }: SupercompressSetupProps) {
  const [isLinked, setIsLinked] = useState(linked);
  const [linkedDate, setLinkedDate] = useState<string | null>(linkedAt ?? null);
  const [apiKey, setApiKey] = useState("");
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim() || pending) return;
    setPending("connect");
    setError(null);
    try {
      const response = await fetch("/api/settings/supercompress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const payload = (await response.json()) as {
        linked?: boolean;
        linkedAt?: string | null;
        error?: { message?: string };
      };
      if (!response.ok || !payload.linked) {
        throw new Error(payload.error?.message ?? "SuperCompress could not be connected.");
      }
      setIsLinked(true);
      setLinkedDate(payload.linkedAt ?? new Date().toISOString());
      setApiKey("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "SuperCompress could not be connected.",
      );
    } finally {
      setPending(null);
    }
  }

  async function disconnect() {
    if (pending) return;
    setPending("disconnect");
    setError(null);
    try {
      const response = await fetch("/api/settings/supercompress", { method: "DELETE" });
      if (!response.ok) throw new Error("SuperCompress could not be disconnected.");
      setIsLinked(false);
      setLinkedDate(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "SuperCompress could not be disconnected.",
      );
    } finally {
      setPending(null);
    }
  }

  if (skipped) return null;

  if (isLinked) {
    return (
      <section data-dashboard-enter aria-label="SuperCompress connection" className="pt-6 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#2c3330] bg-[#0b0e0d] px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden className="size-4 shrink-0 text-[#aeb9c2]" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#aeb9c2] uppercase">
                SuperCompress connected
              </p>
              {linkedDate && (
                <p className="mt-1 font-mono text-[10px] text-[#6d7369]">
                  Linked{" "}
                  {new Date(linkedDate).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={disconnect}
            disabled={pending === "disconnect"}
            className="inline-flex min-h-8 items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[#858b8f] uppercase outline-none transition-colors hover:text-[#eeeeea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2] disabled:pointer-events-none disabled:opacity-40"
          >
            {pending === "disconnect" ? (
              <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : null}
            Disconnect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-dashboard-enter
      aria-labelledby="supercompress-setup-heading"
      className="pt-6 sm:pt-8"
    >
      <div className="border-y border-[#2a2d28] bg-[#0a0b0a]">
        <div className="grid gap-6 px-4 py-6 sm:px-5 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:items-center lg:gap-12">
          <div>
            <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-[#777d73] uppercase">
              Step one &middot; SuperCompress
            </p>
            <h2
              id="supercompress-setup-heading"
              className="text-[clamp(1.45rem,2.4vw,1.9rem)] leading-tight font-semibold tracking-[-0.035em] text-[#f0f1ed]"
            >
              Link your SuperCompress account.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#8b9092]">
              Fork compresses shared repository context before launch, so your agents spend tokens
              on the change instead of rediscovering the codebase. Connecting your account is the
              first thing to set up &mdash; it takes one API key from the SuperCompress dashboard.
            </p>
            <a
              href={SUPERCOMPRESS_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-[#aeb9c2] uppercase underline-offset-4 transition-colors hover:text-[#eeeeea] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
            >
              Get an API key
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </div>
          <form
            onSubmit={connect}
            className="border border-[#2c3034] bg-[#080909] p-4 sm:p-5"
          >
            <label
              htmlFor="supercompress-api-key"
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[#858b80] uppercase"
            >
              <KeyRound aria-hidden className="size-3.5" /> API key
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="supercompress-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-&hellip;"
                autoComplete="off"
                required
                disabled={pending !== null}
                className="h-10 min-w-0 flex-1 rounded-sm border border-[#35383a] bg-[#080909] px-3 font-mono text-sm text-[#e4e5e1] placeholder:text-[#62676a] focus-visible:border-[#aeb9c2] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={pending !== null || !apiKey.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#deded8] px-4 text-sm font-semibold text-[#121313] transition-colors hover:bg-[#c9cdd0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2] disabled:pointer-events-none disabled:opacity-40"
              >
                {pending === "connect" ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                ) : null}
                {pending === "connect" ? "Verifying" : "Connect"}
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#ef9b92]"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
            <p className="mt-3 font-mono text-[9px] leading-4 text-[#555b52]">
              Your key is stored on this server only and used for hosted compression during your
              runs.
            </p>
          </form>
        </div>
        <div className="border-t border-[#242728] px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="font-mono text-[10px] tracking-[0.14em] text-[#6d7369] uppercase underline-offset-4 transition-colors hover:text-[#c6c9cb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2]"
          >
            Skip for now &mdash; I&rsquo;ll connect later
          </button>
        </div>
      </div>
    </section>
  );
}
