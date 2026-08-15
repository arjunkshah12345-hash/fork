import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-8 sm:px-10 sm:py-12">
      <nav className="flex items-center justify-between border-b border-border pb-6">
        <Link href="/" className="text-sm font-semibold tracking-[-0.03em]">FORK</Link>
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back home</Link>
      </nav>
      <article className="py-20 sm:py-28">
        <p className="font-mono text-xs text-primary">TERMS / HACKATHON MVP</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Review the winner before you ship it.</h1>
        <div className="mt-12 space-y-8 text-pretty text-base leading-7 text-muted-foreground">
          <p>FORK is provided as developer tooling. Candidate scores and judge decisions help compare implementations, but they do not replace engineering review, security review, or production validation.</p>
          <p>You are responsible for repositories, credentials, commands, generated changes, and pull requests processed through your installation. Only run FORK against code and systems you are authorized to access.</p>
          <p>Creating a winning pull request is always an explicit action. FORK does not merge, force-push, or deploy candidate code.</p>
        </div>
      </article>
    </main>
  );
}
