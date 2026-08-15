import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RunDetail } from "@/components/dashboard/run-detail";
import { requirePageUser } from "@/lib/auth";
import { getRun } from "@/lib/fork";

export const metadata: Metadata = {
  title: "Run detail",
  description: "Live candidate evidence and winner selection.",
};

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageUser(`/dashboard/runs/${encodeURIComponent(id)}`);
  const run = await getRun(id);
  if (!run) notFound();
  return <RunDetail initialRun={run} />;
}
