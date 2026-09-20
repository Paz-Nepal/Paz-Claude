import type { PostgrestError } from "@supabase/supabase-js";
import { toAppError } from "@paz/types";

export const PAGE_SIZE = 1000;

/**
 * Supabase stops silently at 1000 rows per request. Any list that could
 * ever pass that pages through .range() until exhausted, so a list is
 * never quietly truncated (Build Specification 4.2). The caller passes a
 * function that applies the range to its own query builder.
 */
export async function selectAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw toAppError(error);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}
