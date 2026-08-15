"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="mx-auto grid min-h-dvh w-full max-w-6xl content-center px-6 py-16 sm:px-10">
      <p className="font-mono text-xs text-destructive">APPLICATION ERROR</p>
      <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">This path stopped early.</h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">The current view could not be rendered. Your repository and completed run artifacts were not changed.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-10 w-fit bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        Try again
      </button>
    </main>
  );
}
