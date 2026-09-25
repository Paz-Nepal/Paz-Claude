import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";

interface LooseQuery<T> {
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery<T>;
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
}

type Order = string | [column: string, ascending: boolean];

/**
 * Every row of one api view, paged, in the given order. The view name is a
 * string and the row type is the caller's (taken from the generated
 * `Database["api"]["Views"]`), so a small screen needs one line rather than
 * its own paging code. Named and narrow on purpose, like the RPC cast in the
 * admin hooks.
 */
export function selectView<T>(view: string, orders: Order[]): Promise<T[]> {
  const client = supabase.schema("api") as unknown as {
    from: (v: string) => { select: (c: string) => LooseQuery<T> };
  };
  return selectAll<T>((start, end) => {
    let q = client.from(view).select("*");
    for (const o of orders) q = Array.isArray(o) ? q.order(o[0], { ascending: o[1] }) : q.order(o);
    return q.range(start, end);
  });
}
