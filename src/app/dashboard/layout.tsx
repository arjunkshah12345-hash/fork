import Link from "next/link";
import { GitFork, Plus } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { requirePageUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requirePageUser("/dashboard");

  return (
    <div className="min-h-dvh bg-[#080909] text-[#eeeeea] selection:bg-[#aeb9c2] selection:text-[#111313]">
      <header className="sticky top-0 z-40 border-b border-[#242723] bg-[#070807]/95">
        <nav
          aria-label="Dashboard"
          className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#aeb9c2] focus-visible:ring-offset-4 focus-visible:ring-offset-[#080909]"
            >
              <span className="flex size-7 items-center justify-center border border-[#3b3f40] bg-[#0d0f10]">
                <GitFork aria-hidden className="size-3.5 text-[#aeb9c2]" />
              </span>
              <span className="text-sm font-bold tracking-[0.16em] text-[#f0f2ec]">FORK</span>
            </Link>
            <span aria-hidden className="h-4 w-px bg-[#2c2f2a]" />
            <Link
              href="/dashboard"
              className="font-mono text-[10px] tracking-[0.14em] text-[#a2a6a8] uppercase underline-offset-4 hover:text-[#eeeeea] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#aeb9c2]"
            >
              Runs
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="hidden max-w-44 truncate font-mono text-[10px] text-[#6d7369] sm:block"
              title={user.email}
            >
              {user.email}
            </span>
            <div className="[&_button]:h-8 [&_button]:rounded-sm [&_button]:px-2 [&_button]:text-xs [&_button]:text-[#858b8f] [&_button:hover]:bg-[#121415] [&_button:hover]:text-[#eeeeea] [&_svg]:size-3.5">
              <SignOutButton />
            </div>
            <Link
              href="/dashboard#new-run-heading"
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[#34383a] px-2.5 text-xs font-medium text-[#b8bdc0] transition-colors hover:border-[#596167] hover:text-[#eeeeea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aeb9c2]"
            >
              <Plus aria-hidden className="size-3.5" /> <span className="hidden sm:inline">New run</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
