import type { Metadata } from "next";

import { DashboardMotion } from "@/components/dashboard/dashboard-motion";
import { NewRunComposer } from "@/components/dashboard/new-run-composer";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { SupercompressSetup } from "@/components/dashboard/supercompress-setup";
import { findStoredUserSettings, requirePageUser } from "@/lib/auth";
import { listRuns } from "@/lib/fork";
import type { ForkRun } from "@/lib/fork/types";

export const metadata: Metadata = {
  title: "Runs",
  description: "Launch and review parallel coding-agent runs.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const settings = await findStoredUserSettings(user.id);
  const supercompressLinked = Boolean(settings?.supercompress?.apiKey);
  const supercompressLinkedAt = settings?.supercompress?.linkedAt ?? null;
  let runs: ForkRun[] = [];
  let unavailable = false;
  try {
    runs = await listRuns();
  } catch {
    unavailable = true;
  }

  return (
    <DashboardMotion>
      <SupercompressSetup linked={supercompressLinked} linkedAt={supercompressLinkedAt} />
      <NewRunComposer supercompressLinked={supercompressLinked} />
      <RecentRuns runs={runs} unavailable={unavailable} />
    </DashboardMotion>
  );
}
