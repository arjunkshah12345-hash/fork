"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = {};

export interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  nextTarget?: string;
}

function FieldErrors({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div id={id} className="space-y-1 text-xs leading-5 text-destructive">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  );
}

export function AuthForm({ mode, nextTarget }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const alternatePath = isSignUp ? "/sign-in" : "/sign-up";
  const alternateHref = nextTarget
    ? `${alternatePath}?next=${encodeURIComponent(nextTarget)}`
    : alternatePath;

  return (
    <div className="w-full max-w-[25rem]">
      <div className="mb-9">
        <p className="mb-3 font-mono text-[0.68rem] tracking-[0.2em] text-primary uppercase">
          Local account
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance">
          {isSignUp ? "Create your workspace account" : "Continue to FORK"}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {isSignUp
            ? "Your account stays on this machine. No external auth service is required."
            : "Sign in with the local account stored for this FORK installation."}
        </p>
      </div>

      <form action={formAction} noValidate className="space-y-5">
        <input type="hidden" name="next" value={nextTarget ?? "/dashboard"} />

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.fields?.email}
            aria-invalid={Boolean(state.errors?.email?.length)}
            aria-describedby={state.errors?.email?.length ? "email-errors" : undefined}
            placeholder="you@example.com"
            className="h-11 rounded-md px-3"
          />
          <FieldErrors id="email-errors" errors={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            {isSignUp ? (
              <span className="font-mono text-[0.66rem] text-muted-foreground">
                10+ characters
              </span>
            ) : null}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            aria-invalid={Boolean(state.errors?.password?.length)}
            aria-describedby={state.errors?.password?.length ? "password-errors" : undefined}
            className="h-11 rounded-md px-3"
          />
          <FieldErrors id="password-errors" errors={state.errors?.password} />
        </div>

        {isSignUp ? (
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.errors?.confirmPassword?.length)}
              aria-describedby={
                state.errors?.confirmPassword?.length ? "confirm-password-errors" : undefined
              }
              className="h-11 rounded-md px-3"
            />
            <FieldErrors
              id="confirm-password-errors"
              errors={state.errors?.confirmPassword}
            />
          </div>
        ) : null}

        {state.message ? (
          <p
            role="alert"
            aria-live="polite"
            className="border-l-2 border-destructive pl-3 text-sm leading-6 text-destructive"
          >
            {state.message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-disabled={pending}
          className="mt-1 h-11 w-full rounded-md"
        >
          {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-7 text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "New to this installation?"}{" "}
        <Link
          href={alternateHref}
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
