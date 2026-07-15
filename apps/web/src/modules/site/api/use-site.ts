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
