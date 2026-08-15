import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto grid min-h-dvh w-full max-w-6xl content-center px-6 py-16 sm:px-10">
      <p className="font-mono text-xs text-primary">404 / PATH NOT FOUND</p>
      <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">This branch goes nowhere.</h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">Return to the workspace and start a new execution path.</p>
      <Link href="/dashboard" className="mt-10 w-fit bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">Open dashboard</Link>
    </main>
  );
}
