import { z } from "zod";

export const programSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  summary: z.string().trim(),
  memberOnly: z.boolean(),
});
export type ProgramInput = z.infer<typeof programSchema>;

export const sessionSchema = z.object({
  venueId: z.string(),
  startsAt: z.string().min(1, "Start time is required"),
  endsAt: z.string().min(1, "End time is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
});
export type SessionInput = z.infer<typeof sessionSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().trim(),
});
export type RegisterFormInput = z.infer<typeof registerSchema>;
