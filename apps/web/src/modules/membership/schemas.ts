import { z } from "zod";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().trim(),
  tierKey: z.string().min(1, "Choose a tier"),
  motivation: z.string().trim(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
