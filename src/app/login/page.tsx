import { permanentRedirect } from "next/navigation";

import { authAliasDestination } from "./redirect-target";

interface LoginAliasProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginAlias({ searchParams }: LoginAliasProps) {
  const { next } = await searchParams;
  permanentRedirect(authAliasDestination("/sign-in", next));
}

