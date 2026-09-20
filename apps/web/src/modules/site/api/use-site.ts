import { useMutation, useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { selectAll } from "@/lib/paged";

export type PublishedItem = Database["api"]["Views"]["published_items"]["Row"];
export type PublishedItemDetail =
  Database["api"]["Functions"]["get_published_item"]["Returns"][number];
export type PublicItemType = Database["publishing"]["Enums"]["item_type"];

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them). Same sanctioned cast used in every other module's api file.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

const api = () => supabase.schema("api");

/** Whitelisted institutional settings (api.site_info): name, tagline, contact email. */
export function useSiteInfo() {
  return useQuery({
    queryKey: ["site-info"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("site_info");
      if (error) throw toAppError(error);
      return (data ?? {}) as Record<string, string>;
    },
  });
}

export function usePublishedItems(type?: PublicItemType) {
  return useQuery({
    queryKey: ["published-items", type ?? "all"],
    staleTime: 60_000,
    queryFn: () =>
      selectAll<PublishedItem>((from, to) => {
        let query = api().from("published_items").select("*");
        if (type) query = query.eq("type", type);
        return query.order("published_at", { ascending: false }).order("id").range(from, to);
      }),
  });
}

export function usePublishedItem(type: PublicItemType, slug: string | undefined) {
  return useQuery({
    queryKey: ["published-item", type, slug],
    enabled: Boolean(slug),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api()
        .rpc("get_published_item", { p_type: type, p_slug: slug as string })
        .maybeSingle();
      if (error) throw toAppError(error);
      return data; // null => not published / never existed
    },
  });
}

export function publicMediaUrl(storagePath: string): string {
  return supabase.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Where a published item of a given type actually lives. `event` has no
 * public route yet (api.get_event exists but no page consumes it) and
 * `page` is the CMS catch-all at the root — both handled by callers via
 * the null/`/${slug}` cases rather than guessed here.
 */
export function publishedItemHref(item: Pick<PublishedItem, "type" | "slug">): string | null {
  if (!item.slug) return null;
  switch (item.type) {
    case "article":
      return `/journal/${item.slug}`;
    case "paper":
      return `/papers/${item.slug}`;
    case "brief":
      return `/brief/${item.slug}`;
    case "dispatch":
      return `/dispatch/${item.slug}`;
    case "annual":
      return `/annual/${item.slug}`;
    case "pigeon_post":
      return `/pigeon-post/${item.slug}`;
    case "page":
      return `/${item.slug}`;
    default:
      return null;
  }
}

export function useSearchPublished(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["search-published", query],
    enabled: query.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc(
        "search_published",
        asArgs<Database["api"]["Functions"]["search_published"]["Args"]>({ q: query }),
      );
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export type PaperDetail = Database["api"]["Functions"]["get_paper"]["Returns"][number];
export type BriefDetail = Database["api"]["Functions"]["get_brief"]["Returns"][number];
export type DispatchDetail = Database["api"]["Functions"]["get_dispatch"]["Returns"][number];
export type PigeonPostDetail = Database["api"]["Functions"]["get_pigeon_post"]["Returns"][number];
export type AnnualDetail = Database["api"]["Functions"]["get_annual"]["Returns"][number];
export type RecordEntry = Database["api"]["Views"]["record_entries"]["Row"];

/** One thin fetcher per series (mirrors the api.get_* split) rather than a
 * single generic function with an unused-column shape per call site. */
function useSeriesDetail<T>(
  fn: "get_paper" | "get_brief" | "get_dispatch" | "get_pigeon_post" | "get_annual",
  slug: string | undefined,
) {
  return useQuery({
    queryKey: [fn, slug],
    enabled: Boolean(slug),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api()
        .rpc(fn, { p_slug: slug as string })
        .maybeSingle();
      if (error) throw toAppError(error);
      return data as T | null;
    },
  });
}

export const usePaper = (slug: string | undefined) =>
  useSeriesDetail<PaperDetail>("get_paper", slug);
export const useBrief = (slug: string | undefined) =>
  useSeriesDetail<BriefDetail>("get_brief", slug);
export const useDispatch = (slug: string | undefined) =>
  useSeriesDetail<DispatchDetail>("get_dispatch", slug);
export const usePigeonPost = (slug: string | undefined) =>
  useSeriesDetail<PigeonPostDetail>("get_pigeon_post", slug);
export const useAnnual = (slug: string | undefined) =>
  useSeriesDetail<AnnualDetail>("get_annual", slug);

export interface SendAPigeonInput {
  contributorName: string | null;
  contributorContact: string | null;
  content: string;
}

/** Contributor identity, if given, is staff-only forever (never selected
 * by any anon-facing view) -- same rule as the published series itself. */
/**
 * Routed through the send-a-pigeon Edge Function, not a direct RPC:
 * api.send_a_pigeon is granted to service_role only (migration 0051) so
 * the Edge Function's rate-limit check is the only path in, not a layer
 * that a caller hitting PostgREST directly could just skip.
 */
export function useSendAPigeon() {
  return useMutation({
    mutationFn: async (input: SendAPigeonInput) => {
      await invokeEdgeFunction<{ ok: true }>("send-a-pigeon", {
        contributorName: input.contributorName,
        contributorContact: input.contributorContact,
        content: input.content,
      });
    },
  });
}

/** Looks up publishing.redirects for a path the router couldn't otherwise
 * match -- a slug or series change on a published item never has to become
 * a broken link (work plan Part II, #7). `null` means no redirect exists,
 * i.e. this really is a 404, not just "not looked up yet". */
export function useRedirect(path: string) {
  return useQuery({
    queryKey: ["redirect", path],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("get_redirect", { p_path: path });
      if (error) throw toAppError(error);
      return data; // string | null
    },
  });
}

export interface SubmitContactMessageInput {
  fullName: string;
  email: string;
  message: string;
}

/**
 * Routed through the submit-contact-message Edge Function (not a direct
 * RPC, unlike send_a_pigeon above) because this flow also notifies staff
 * by email -- api.submit_contact_message alone only writes the row.
 */
export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: async (input: SubmitContactMessageInput) => {
      const { messageId } = await invokeEdgeFunction<{ messageId: string }>(
        "submit-contact-message",
        { fullName: input.fullName, email: input.email, message: input.message },
      );
      return messageId;
    },
  });
}

const RECORD_PAGE_SIZE = 1000;

/**
 * Site audit, 18 Sept 2026: two separate findings on this one query.
 *
 * "The Record is the one query with no ordering": the page promises
 * entries "in order" but the query had no .order(), so Postgres was
 * free to return rows in whatever order it liked -- fixed below,
 * ordered by deposit_number, the permanent zero-padded sequential
 * reference (publishing.next_deposit_ref()) the register is actually
 * built around.
 *
 * Follow-up audit: "Ordering was added but no .limit() or .range().
 * Every query still stops silently at Supabase's default thousand
 * rows, the Record included. It is now a correctly ordered list that
 * will quietly stop at deposit one thousand." record-page.tsx's own
 * comment says pagination is deliberately not wanted here ("no
 * filtering or pagination cleverness... it is the whole log") -- a
 * "Load more" UI would contradict that intent, so instead of adding
 * one, this loops .range() pages internally until exhausted and
 * returns the complete list. The reader-facing behavior (the whole
 * log, no button) stays exactly what it was designed to be; only the
 * silent 1000-row cap that behavior was quietly relying on is closed.
 */
export function useRecordEntries() {
  return useQuery({
    queryKey: ["record-entries"],
    staleTime: 60_000,
    queryFn: async () => {
      const all: RecordEntry[] = [];
      for (let from = 0; ; from += RECORD_PAGE_SIZE) {
        const { data, error } = await api()
          .from("record_entries")
          .select("*")
          .order("deposit_number", { ascending: true })
          .range(from, from + RECORD_PAGE_SIZE - 1);
        if (error) throw toAppError(error);
        all.push(...(data ?? []));
        if (!data || data.length < RECORD_PAGE_SIZE) break;
      }
      return all;
    },
  });
}
