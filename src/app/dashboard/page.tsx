import type { Metadata } from "next";

import { DashboardMotion } from "@/components/dashboard/dashboard-motion";
import { NewRunComposer } from "@/components/dashboard/new-run-composer";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { requirePageUser } from "@/lib/auth";
import { listRuns } from "@/lib/fork";
import type { ForkRun } from "@/lib/fork/types";

export const metadata: Metadata = {
  title: "Runs",
  description: "Launch and review parallel coding-agent runs.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageUser("/dashboard");
  let runs: ForkRun[] = [];
  let unavailable = false;
  try {
    runs = await listRuns();
  } catch {
    unavailable = true;
  }

  return (
    <DashboardMotion>
      <NewRunComposer />
      <RecentRuns runs={runs} unavailable={unavailable} />
    </DashboardMotion>
  );
}
