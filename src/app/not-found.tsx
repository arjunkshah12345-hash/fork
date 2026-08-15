import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto grid min-h-dvh w-full max-w-6xl content-center px-6 py-16 sm:px-10">
      <p className="font-mono text-xs text-primary">404 / PATH NOT FOUND</p>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">This route does not exist.</h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">Return to the workspace and start a new execution path.</p>
      <Link href="/" className="mt-9 w-fit bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">Return home</Link>
    </main>
  );
}
