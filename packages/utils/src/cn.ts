import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, resolving conflicting Tailwind utilities in favor of
 * the last one supplied. Carried forward unchanged from the legacy prototype
 * (apps/web/src/lib/utils.js) — this function was already correct.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
