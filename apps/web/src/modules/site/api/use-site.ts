import { useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type PublishedItem = Database["api"]["Views"]["published_items"]["Row"];
export type PublishedItemDetail =
  Database["api"]["Functions"]["get_published_item"]["Returns"][number];
export type PublicItemType = Database["publishing"]["Enums"]["item_type"];

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
