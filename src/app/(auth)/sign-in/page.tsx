import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getUser, safeRedirectTarget } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

interface SignInPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextTarget = safeRedirectTarget(requested, "/dashboard");
  if (await getUser()) redirect(nextTarget);
  return <AuthForm mode="sign-in" nextTarget={nextTarget} />;
}
