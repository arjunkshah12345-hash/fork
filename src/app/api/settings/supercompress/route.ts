import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { findStoredUserSettings, updateUserSettings } from "@/lib/auth";
import { verifySupercompressApiKey } from "@/lib/fork/supercompress";

import { apiError, requireApiUser } from "../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const connectSchema = z
  .object({
    apiKey: z.string().trim().min(8).max(512),
  })
  .strict();

export async function GET(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const user = await requireUser(request);
    const settings = await findStoredUserSettings(user.id);
    return Response.json({
      linked: Boolean(settings?.supercompress?.apiKey),
      linkedAt: settings?.supercompress?.linkedAt ?? null,
    });
  } catch {
    return apiError(
      "SETTINGS_UNAVAILABLE",
      "SuperCompress settings could not be loaded. Check local auth storage and retry.",
      500,
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const parsed = connectSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return apiError(
        "INVALID_SUPERCOMPRESS_KEY",
        "Enter a valid SuperCompress API key to connect your account.",
        422,
        parsed.error.issues.map((issue) => ({ path: issue.path.join(".") || "$", message: issue.message })),
      );
    }
    const { apiKey } = parsed.data;
    await verifySupercompressApiKey(apiKey);
    const user = await requireUser(request);
    const linkedAt = new Date().toISOString();
    await updateUserSettings(user.id, { supercompress: { apiKey, linkedAt } });
    return Response.json(
      { linked: true, linkedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SuperCompress could not be connected.";
    return apiError("SUPERCOMPRESS_CONNECT_FAILED", message, 400);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const user = await requireUser(request);
    const settings = await findStoredUserSettings(user.id);
    const next = settings ? { ...settings } : {};
    if (next.supercompress) delete next.supercompress;
    await updateUserSettings(user.id, next);
    return Response.json(
      { linked: false, linkedAt: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return apiError(
      "SETTINGS_UNAVAILABLE",
      "SuperCompress settings could not be updated. Check local auth storage and retry.",
      500,
    );
  }
}
