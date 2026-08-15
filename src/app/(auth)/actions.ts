"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import {
  AuthConfigurationError,
  AuthStorageError,
  DuplicateEmailError,
  authenticateUser,
  getAuthSecret,
  registerUser,
  safeRedirectTarget,
} from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/auth/validation";

export interface AuthActionState {
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  fields?: { email?: string };
}

function invalidState(
  result: { error: z.ZodError },
  submittedEmail: FormDataEntryValue | null,
): AuthActionState {
  const errors = result.error.flatten().fieldErrors;
  return {
    errors,
    fields: { email: typeof submittedEmail === "string" ? submittedEmail : undefined },
  };
}

function unavailableState(error: unknown): AuthActionState {
  if (error instanceof AuthConfigurationError) {
    return { message: "Authentication is not configured correctly on this server." };
  }
  if (error instanceof AuthStorageError) {
    return { message: "Local account storage is unavailable. Check .fork/auth and retry." };
  }
  return { message: "Authentication failed unexpectedly. Please retry." };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const submittedEmail = formData.get("email");
  const parsed = signUpSchema.safeParse({
    email: submittedEmail,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return invalidState(parsed, submittedEmail);

  try {
    // Fail before creating the user if production is missing its signing secret.
    getAuthSecret();
    const user = await registerUser(parsed.data);
    await setSessionCookie(user.id);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return {
        errors: { email: [error.message] },
        fields: { email: parsed.data.email },
      };
    }
    return { ...unavailableState(error), fields: { email: parsed.data.email } };
  }

  redirect(safeRedirectTarget(formData.get("next"), "/dashboard"));
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const submittedEmail = formData.get("email");
  const parsed = signInSchema.safeParse({
    email: submittedEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) return invalidState(parsed, submittedEmail);

  try {
    getAuthSecret();
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return {
        message: "Email or password is incorrect.",
        fields: { email: parsed.data.email },
      };
    }
    await setSessionCookie(user.id);
  } catch (error) {
    return { ...unavailableState(error), fields: { email: parsed.data.email } };
  }

  redirect(safeRedirectTarget(formData.get("next"), "/dashboard"));
}

export async function signOutAction(): Promise<never> {
  await deleteSessionCookie();
  redirect("/sign-in");
}
