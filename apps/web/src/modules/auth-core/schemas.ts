import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const mfaChallengeSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code from your authenticator app")
    .regex(/^\d+$/, "Code must be numeric"),
});
export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>;
