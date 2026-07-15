import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type ItemType = Database["publishing"]["Enums"]["item_type"];
export type ItemStatus = Database["publishing"]["Enums"]["item_status"];
export type DeskItem = Database["api"]["Views"]["desk_items"]["Row"];
export type MediaRow = Database["api"]["Views"]["media_library"]["Row"];
export type ItemDetail = Database["api"]["Functions"]["get_item"]["Returns"][number];

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them). This is the one sanctioned cast around that gap — keep every use
 * of it in this file so the workaround never spreads.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

const api = () => supabase.schema("api");

export function useDeskItems() {
  return useQuery({
    queryKey: ["desk-items"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("desk_items")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ["item", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await api()
        .rpc("get_item", { p_id: id as string })
        .single();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveItemInput {
  id: string | null;
  type: ItemType;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  body: unknown;
  featuredMedia: string | null;
  tags: string[];
}

export function useSaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveItemInput) => {
      const { data: itemId, error } = await api().rpc(
        "save_item",
        asArgs<Database["api"]["Functions"]["save_item"]["Args"]>({
          p_id: input.id,
          p_type: input.type,
          p_slug: input.slug,
          p_title: input.title,
          p_subtitle: input.subtitle,
          p_summary: input.summary,
          p_body: input.body,
          p_featured_media: input.featuredMedia,
        }),
      );
      if (error) throw toAppError(error);

      const { error: tagsError } = await api().rpc("set_item_tags", {
        p_item: itemId,
        p_tags: input.tags,
      });
      if (tagsError) throw toAppError(tagsError);
      return itemId;
    },
    onSuccess: (itemId) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", itemId] });
    },
  });
}

export function useTransitionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to }: { id: string; to: ItemStatus }) => {
      const { data, error } = await api().rpc("transition_item", { p_id: id, p_to: to });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: (_status, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
  });
}

export function useMediaLibrary() {
  return useQuery({
    queryKey: ["media-library"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("media_library")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function mediaPublicUrl(storagePath: string): string {
  return supabase.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
}

export interface UploadMediaInput {
  file: File;
  alt: string;
  credit: string | null;
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, alt, credit }: UploadMediaInput) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const storagePath = `original/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw toAppError(uploadError);

      let width: number | null = null;
      let height: number | null = null;
      if (file.type.startsWith("image/")) {
        try {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          // Not decodable client-side (e.g. an SVG in some browsers) —
          // dimensions stay unknown; nothing depends on them yet.
        }
      }

      const { data, error } = await api().rpc(
        "register_media",
        asArgs<Database["api"]["Functions"]["register_media"]["Args"]>({
          p_storage_path: storagePath,
          p_mime_type: file.type || "application/octet-stream",
          p_size_bytes: file.size,
          p_width: width,
          p_height: height,
          p_alt: alt,
          p_credit: credit,
        }),
      );
      if (error) throw toAppError(error);
      return { id: data, storagePath };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
  });
}
