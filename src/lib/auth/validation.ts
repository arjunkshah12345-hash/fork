import { z } from "zod";

export const authEmailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const authPasswordSchema = z
  .string({ error: "Enter your password." })
  .min(10, "Use at least 10 characters.")
  .max(128, "Password must be at most 128 characters.");

export const signInSchema = z
  .object({ email: authEmailSchema, password: authPasswordSchema })
  .strict();

export const signUpSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: z.string({ error: "Confirm your password." }),
  })
  .strict()
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

