import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edge-functions";

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
  titleNe: string | null;
  subtitle: string | null;
  subtitleNe: string | null;
  summary: string | null;
  summaryNe: string | null;
  body: unknown;
  bodyNe: unknown;
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
          p_title_ne: input.titleNe,
          p_subtitle: input.subtitle,
          p_subtitle_ne: input.subtitleNe,
          p_summary: input.summary,
          p_summary_ne: input.summaryNe,
          p_body: input.body,
          p_body_ne: input.bodyNe,
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

export interface AutosaveItemInput {
  id: string;
  title: string;
  titleNe: string | null;
  body: unknown;
  bodyNe: unknown;
}

/**
 * T-048. Debounced background save for an *existing* item's title/body
 * only -- distinct from useSaveItem, which the Save button keeps using
 * unchanged. publishing.autosave_item (0062) coalesces repeated autosave
 * ticks into a single revision rather than flooding the version history
 * panel with one snapshot per tick; a manual save still always creates
 * its own fresh checkpoint. See that migration for the full reasoning.
 */
export function useAutosaveItem() {
  return useMutation({
    mutationFn: async (input: AutosaveItemInput) => {
      await invokeEdgeFunction<{ ok: true }>("autosave-item", { ...input });
    },
    // Deliberately no query invalidation on success -- refetching
    // ["item", id] after every autosave tick would reset the body
    // editors' uncontrolled state mid-typing. The next manual save,
    // navigation, or page reload picks up fresh data normally.
  });
}

/**
 * Every edge except transitioning *into* 'scheduled' uses a `p_to` value
 * that's already in the generated enum (draft/in_review/published/
 * archived — 'scheduled' itself, T-061/0046, isn't). Scheduling has its
 * own hook (`useScheduleItem`, Edge-Function-backed) below, so this one
 * stays on the direct, still-typed RPC call. `p_notes`/`p_scheduled_for`
 * (T-059/0048) render as optional non-nullable `string` in the generated
 * Args type (same `supabase gen types` quirk noted elsewhere in this
 * file: nullable SQL params come out non-nullable) -- `undefined`, not
 * `null`, is what satisfies that under `exactOptionalPropertyTypes`.
 */
export function useTransitionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      to,
      notes,
    }: {
      id: string;
      to: Exclude<ItemStatus, "scheduled">;
      notes?: string | null;
    }) => {
      const { data, error } = await api().rpc(
        "transition_item",
        asArgs<{ p_id: string; p_to: Exclude<ItemStatus, "scheduled">; p_notes?: string }>({
          p_id: id,
          p_to: to,
          p_notes: notes ?? undefined,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: (_status, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
  });
}

/**
 * T-061. Transitioning *into* 'scheduled' needs both the new status
 * literal and api.transition_item's new p_scheduled_for param (0047),
 * neither in the generated types (new this session) -- routed through
 * an Edge Function with a hand-typed request, same reasoning as every
 * other object added since ADR-26.
 */
export function useScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scheduledFor }: { id: string; scheduledFor: string }) => {
      await invokeEdgeFunction<{ ok: true }>("schedule-item", { itemId: id, scheduledFor });
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
  });
}

/** Deposits a Paper/Brief/Dispatch/Pigeon Post/Annual: assigns the
 * permanent deposit_ref, publishes it, and writes its Record entry, all
 * in one call (publishing.deposit_item). Rejected by the database for
 * any other type (spec §2: the Record indexes exactly these five). */
export function useDepositItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api().rpc("deposit_item", { p_id: id });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: (_status, id) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
      void queryClient.invalidateQueries({ queryKey: ["record-entries"] });
    },
  });
}

export function useDiscardDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api().rpc("discard_draft", { p_id: id });
      if (error) throw toAppError(error);
    },
    onSuccess: (_void, id) => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
  });
}

export interface PaperDetailsInput {
  p_item: string;
  p_abstract: string | null;
  p_pdf_media: string | null;
  p_license: string;
  p_sources_note: string | null;
}

export interface IssueDetailsInput {
  p_item: string;
  p_issue_date: string | null;
}

export interface PigeonPostDetailsInput {
  p_item: string;
  p_edition_no: string;
  p_pdf_media: string | null;
}

export interface AnnualDetailsInput {
  p_item: string;
  p_year: number;
  p_contents: string | null;
  p_pdf_media: string | null;
}

export interface EventDetailsInput {
  p_item: string;
  p_event_date: string;
  p_location: string | null;
}

/** One save hook per series (matching the one-function-per-series api
 * surface, 0029) -- written out separately rather than a single generic
 * dispatcher, since PostgREST's `.rpc()` overloads resolve per literal
 * function name and don't unify cleanly under a type parameter. A Pigeon
 * Post form has no author field to send because PigeonPostDetailsInput
 * has no property for one. */
function useSaveDetailsMutation<Input extends { p_item: string }>(
  rpc: (input: Input) => PromiseLike<{ error: unknown }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => {
      const { error } = await rpc(input);
      if (error) throw toAppError(error);
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: ["item", input.p_item] });
    },
  });
}

export const useSavePaperDetails = () =>
  useSaveDetailsMutation<PaperDetailsInput>((input) =>
    api().rpc(
      "save_paper_details",
      asArgs<Database["api"]["Functions"]["save_paper_details"]["Args"]>(input),
    ),
  );
export const useSaveBriefDetails = () =>
  useSaveDetailsMutation<IssueDetailsInput>((input) =>
    api().rpc(
      "save_brief_details",
      asArgs<Database["api"]["Functions"]["save_brief_details"]["Args"]>(input),
    ),
  );
export const useSaveDispatchDetails = () =>
  useSaveDetailsMutation<IssueDetailsInput>((input) =>
    api().rpc(
      "save_dispatch_details",
      asArgs<Database["api"]["Functions"]["save_dispatch_details"]["Args"]>(input),
    ),
  );
export const useSavePigeonPostDetails = () =>
  useSaveDetailsMutation<PigeonPostDetailsInput>((input) =>
    api().rpc(
      "save_pigeon_post_details",
      asArgs<Database["api"]["Functions"]["save_pigeon_post_details"]["Args"]>(input),
    ),
  );
export const useSaveAnnualDetails = () =>
  useSaveDetailsMutation<AnnualDetailsInput>((input) =>
    api().rpc(
      "save_annual_details",
      asArgs<Database["api"]["Functions"]["save_annual_details"]["Args"]>(input),
    ),
  );
export const useSaveEventDetails = () =>
  useSaveDetailsMutation<EventDetailsInput>((input) =>
    api().rpc(
      "save_event_details",
      asArgs<Database["api"]["Functions"]["save_event_details"]["Args"]>(input),
    ),
  );

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
      // Routed through the ingest-media Edge Function, which sniffs the
      // real file type by magic bytes, strips EXIF, and reads dimensions
      // from the header server-side — trusting the browser's file.type
      // and a client-side createImageBitmap decode was exactly the
      // "uploads currently go straight to storage... hardening lands with
      // the Edge Function" gap migration 0008 flagged (D-8, T-041).
      const form = new FormData();
      form.append("file", file);
      form.append("alt", alt);
      if (credit) form.append("credit", credit);

      const { mediaId, storagePath } = await invokeEdgeFunction<{
        mediaId: string;
        storagePath: string;
      }>("ingest-media", form);
      return { id: mediaId, storagePath };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
  });
}

export type PigeonSubmission = Database["api"]["Views"]["pigeon_submissions"]["Row"];

export function usePigeonSubmissions() {
  return useQuery({
    queryKey: ["pigeon-submissions"],
    queryFn: async () => {
      const { data, error } = await api().from("pigeon_submissions").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMarkPigeonSubmissionReviewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api().rpc("mark_pigeon_submission_reviewed", { p_id: id });
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pigeon-submissions"] });
    },
  });
}

/** The one path to a correction (spec §3: additions, never destruction).
 * Returns the new draft's id so the caller can navigate straight to it. */
export function useCreateCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (originalId: string) => {
      const { data, error } = await api().rpc("create_correction", { p_original: originalId });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["desk-items"] });
    },
  });
}

/**
 * T-060. api.item_revisions / get_item_revision / restore_item_revision
 * (0045) aren't in the generated types (new this session, never
 * regenerated against a live database) -- hand typed here, same
 * reasoning as everywhere else since ADR-26.
 */
export interface ItemRevisionSummary {
  id: string;
  revision_no: number;
  kind: string;
  title: string;
  created_by_name: string | null;
  created_at: string;
  /** T-059/0048. Set only on some 'transition' revisions (e.g. a send-back). */
  notes: string | null;
}

export interface ItemRevisionDetail extends ItemRevisionSummary {
  item_id: string;
  body: unknown;
  body_schema_version: number;
}

export function useItemRevisions(itemId: string | undefined) {
  return useQuery({
    queryKey: ["item-revisions", itemId],
    enabled: Boolean(itemId),
    queryFn: async () => {
      const { revisions } = await invokeEdgeFunction<{ revisions: ItemRevisionSummary[] }>(
        "list-item-revisions",
        { itemId },
      );
      return revisions;
    },
  });
}

export function useItemRevision(revisionId: string | undefined) {
  return useQuery({
    queryKey: ["item-revision", revisionId],
    enabled: Boolean(revisionId),
    queryFn: async () => {
      const { revision } = await invokeEdgeFunction<{ revision: ItemRevisionDetail | null }>(
        "get-item-revision",
        { revisionId },
      );
      return revision;
    },
  });
}

export function useRestoreItemRevision(itemId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (revisionId: string) => {
      await invokeEdgeFunction<{ ok: true }>("restore-item-revision", { revisionId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["item-revisions", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["item", itemId] });
    },
  });
}
