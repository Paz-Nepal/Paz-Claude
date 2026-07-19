import { z } from "zod";

export const itemMetadataSchema = z.object({
  type: z.enum(["article", "page", "paper", "brief", "dispatch", "pigeon_post", "annual", "event"]),
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  subtitle: z.string().trim(),
  summary: z.string().trim(),
  titleNe: z.string().trim(),
  subtitleNe: z.string().trim(),
  summaryNe: z.string().trim(),
  tags: z.string(), // comma-separated in the form; split on save
});

export type ItemMetadataInput = z.infer<typeof itemMetadataSchema>;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
