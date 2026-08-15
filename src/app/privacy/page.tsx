import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-8 sm:px-10 sm:py-12">
      <nav className="flex items-center justify-between border-b border-border pb-6">
        <Link href="/" className="text-sm font-semibold tracking-[-0.03em]">FORK</Link>
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back home</Link>
      </nav>
      <article className="py-20 sm:py-28">
        <p className="font-mono text-xs text-primary">PRIVACY / LOCAL-FIRST MVP</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your code stays in your workspace.</h1>
        <div className="mt-12 space-y-8 text-pretty text-base leading-7 text-muted-foreground">
          <p>FORK runs Git worktrees, the selected coding-agent CLI, checks, and evaluations on the machine hosting the application. Run artifacts and local account records are stored under the ignored <code className="font-mono text-foreground">.fork/</code> directory.</p>
          <p>FORK sends code to external services only when you select or enable them, including Codex, OpenCode model providers, Cursor, SuperCompress MCP or hosted compression, Greptile, and GitHub pull-request publication. Their respective privacy terms apply to those requests.</p>
          <p>Passwords are stored as salted hashes. Authentication uses a signed, HTTP-only session cookie. Do not deploy the local account store as a multi-tenant production identity system; connect a managed identity provider before public deployment.</p>
        </div>
      </article>
    </main>
  );
}
