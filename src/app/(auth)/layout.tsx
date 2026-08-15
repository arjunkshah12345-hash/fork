import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="main-content" className="relative flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border px-5 sm:px-8">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-[0.24em] text-foreground"
          aria-label="FORK home"
        >
          FORK<span className="text-primary">/</span>
        </Link>
        <span className="ml-auto font-mono text-[0.64rem] tracking-[0.16em] text-muted-foreground uppercase">
          Local-first access
        </span>
      </header>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(30rem,0.78fr)]">
        <section className="hidden border-r border-border p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <p className="font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
            Speculative execution
          </p>
          <div className="max-w-xl pb-8">
            <div className="mb-8 flex items-center gap-3" aria-hidden>
              <span className="h-px w-14 bg-primary" />
              <span className="h-px w-9 bg-foreground/30" />
              <span className="h-px w-5 bg-foreground/15" />
            </div>
            <p className="text-4xl leading-[1.08] font-medium tracking-[-0.04em] text-balance xl:text-5xl">
              Run multiple implementations. Ship the one that proves itself.
            </p>
            <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
              Accounts, runs, and generated worktrees stay on this installation unless you
              explicitly publish a winning branch.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-14 sm:px-10 lg:px-16">
          {children}
        </section>
      </div>
    </main>
  );
}
