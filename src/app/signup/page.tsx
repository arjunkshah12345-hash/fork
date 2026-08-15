import { permanentRedirect } from "next/navigation";

import { authAliasDestination } from "../login/redirect-target";

interface SignupAliasProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function SignupAlias({ searchParams }: SignupAliasProps) {
  const { next } = await searchParams;
  permanentRedirect(authAliasDestination("/sign-up", next));
}

