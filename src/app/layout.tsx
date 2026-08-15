import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FORK — Speculative execution for coding agents",
    template: "%s — FORK",
  },
  description: "Run multiple implementations. Test every branch. Ship the best one.",
  applicationName: "FORK",
  keywords: ["Codex", "OpenCode", "Cursor Agent", "coding agents", "Git worktrees", "code evaluation"],
  openGraph: {
    title: "FORK — Speculative execution for coding agents",
    description: "Run multiple implementations. Test every branch. Ship the best one.",
    type: "website",
    siteName: "FORK",
  },
  twitter: {
    card: "summary_large_image",
    title: "FORK — Speculative execution for coding agents",
    description: "Run multiple implementations. Test every branch. Ship the best one.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070707",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[101] -translate-y-24 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
