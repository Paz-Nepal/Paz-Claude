import { useMutation, useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edge-functions";

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
    queryFn: async () => {
      let query = api()
        .from("published_items")
        .select("*")
        .order("published_at", { ascending: false });
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw toAppError(error);
      return data;
    },
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
export function useSendAPigeon() {
  return useMutation({
    mutationFn: async (input: SendAPigeonInput) => {
      const { error } = await api().rpc(
        "send_a_pigeon",
        asArgs<Database["api"]["Functions"]["send_a_pigeon"]["Args"]>({
          p_contributor_name: input.contributorName,
          p_contributor_contact: input.contributorContact,
          p_content: input.content,
        }),
      );
      if (error) throw toAppError(error);
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

export function useRecordEntries() {
  return useQuery({
    queryKey: ["record-entries"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api().from("record_entries").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}
