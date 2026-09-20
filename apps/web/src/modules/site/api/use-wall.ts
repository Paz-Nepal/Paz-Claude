import { useMutation, useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";
import { invokeEdgeFunction } from "@/lib/edge-functions";

type Views = Database["api"]["Views"];

export type WallPerson = Views["wall_people"]["Row"];
export type WallWork = Views["wall_works"]["Row"];
export type WallWorkImage = Views["wall_work_images"]["Row"];
export type WallWorkEvent = Views["wall_work_events"]["Row"];
export type WallWorkText = Views["wall_work_texts"]["Row"];
export type WallShow = Views["wall_shows"]["Row"];
export type WallPersonExhibition = Views["wall_person_exhibitions"]["Row"];
export type WallPersonWriting = Views["wall_person_writings"]["Row"];
export type SattalPiece = Views["sattal_pieces"]["Row"];
export type SattalReader = Views["sattal_readers"]["Row"];
export type SattalCorrection = Views["sattal_corrections"]["Row"];
export type ChronicleLine = Views["chronicle_lines"]["Row"];
export type GlossaryTerm = Views["glossary_terms"]["Row"];

const api = () => supabase.schema("api");
const STALE = 60_000;

export interface ImageVariant {
  w: number;
  h: number;
  webp?: string;
  jpg?: string;
}

/** Newest first: the wall lists people alphabetically, works by number. */
export function usePeople() {
  return useQuery({
    queryKey: ["wall-people"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallPerson>((from, to) =>
        api().from("wall_people").select("*").order("name").order("id").range(from, to),
      ),
  });
}

export function usePerson(slug: string | undefined) {
  return useQuery({
    queryKey: ["wall-person", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("wall_people")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useWorks(personId?: string) {
  return useQuery({
    queryKey: ["wall-works", personId ?? "all"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallWork>((from, to) => {
        let q = api().from("wall_works").select("*");
        if (personId) q = q.eq("person_id", personId);
        return q.order("work_number", { ascending: false }).range(from, to);
      }),
  });
}

export function useWork(slug: string | undefined) {
  return useQuery({
    queryKey: ["wall-work", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("wall_works")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

/** Whole frames for many works at once (listings show the whole work only). */
export function useWorkImages(workIds: string[]) {
  const key = [...workIds].sort().join(",");
  return useQuery({
    queryKey: ["wall-work-images", key],
    enabled: workIds.length > 0,
    staleTime: STALE,
    queryFn: async () => {
      const out: WallWorkImage[] = [];
      // Chunked so the in() list never grows past a sane URL length.
      for (let i = 0; i < workIds.length; i += 100) {
        const chunk = workIds.slice(i, i + 100);
        const rows = await selectAll<WallWorkImage>((from, to) =>
          api()
            .from("wall_work_images")
            .select("*")
            .in("work_id", chunk)
            .order("work_id")
            .order("frame")
            .range(from, to),
        );
        out.push(...rows);
      }
      return out;
    },
  });
}

export function useWorkEvents(workId: string | undefined) {
  return useQuery({
    queryKey: ["wall-work-events", workId],
    enabled: Boolean(workId),
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallWorkEvent>((from, to) =>
        api()
          .from("wall_work_events")
          .select("*")
          .eq("work_id", workId as string)
          .order("occurred_on")
          .order("id")
          .range(from, to),
      ),
  });
}

export function useWorkTexts(workId: string | undefined) {
  return useQuery({
    queryKey: ["wall-work-texts", workId],
    enabled: Boolean(workId),
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallWorkText>((from, to) =>
        api()
          .from("wall_work_texts")
          .select("*")
          .eq("work_id", workId as string)
          .order("id")
          .range(from, to),
      ),
  });
}

export function useShows() {
  return useQuery({
    queryKey: ["wall-shows"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallShow>((from, to) =>
        api()
          .from("wall_shows")
          .select("*")
          .order("opened_on", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useShow(slug: string | undefined) {
  return useQuery({
    queryKey: ["wall-show", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("wall_shows")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useShowWorkLinks() {
  return useQuery({
    queryKey: ["wall-show-works"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<{ show_id: string | null; work_id: string | null }>((from, to) =>
        api().from("wall_show_works").select("*").order("show_id").order("work_id").range(from, to),
      ),
  });
}

export function usePersonExhibitions(personId: string | undefined) {
  return useQuery({
    queryKey: ["wall-person-exhibitions", personId],
    enabled: Boolean(personId),
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallPersonExhibition>((from, to) =>
        api()
          .from("wall_person_exhibitions")
          .select("*")
          .eq("person_id", personId as string)
          .order("year", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function usePersonWritings(personId: string | undefined) {
  return useQuery({
    queryKey: ["wall-person-writings", personId],
    enabled: Boolean(personId),
    staleTime: STALE,
    queryFn: () =>
      selectAll<WallPersonWriting>((from, to) =>
        api()
          .from("wall_person_writings")
          .select("*")
          .eq("person_id", personId as string)
          .order("year", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

// ---------------------------------------------------------------------
// The Sattal
// ---------------------------------------------------------------------
export function useSattalPieces() {
  return useQuery({
    queryKey: ["sattal-pieces"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<SattalPiece>((from, to) =>
        api()
          .from("sattal_pieces")
          .select("*")
          .order("published_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useSattalPiece(slug: string | undefined) {
  return useQuery({
    queryKey: ["sattal-piece", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("sattal_pieces")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSattalReaders() {
  return useQuery({
    queryKey: ["sattal-readers"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<SattalReader>((from, to) =>
        api().from("sattal_readers").select("*").order("appointed_on").order("id").range(from, to),
      ),
  });
}

export function useSattalCorrections(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["sattal-corrections", pieceId],
    enabled: Boolean(pieceId),
    staleTime: STALE,
    queryFn: () =>
      selectAll<SattalCorrection>((from, to) =>
        api()
          .from("sattal_corrections")
          .select("*")
          .eq("piece_id", pieceId as string)
          .order("added_at")
          .order("id")
          .range(from, to),
      ),
  });
}

// ---------------------------------------------------------------------
// The Chronicle: one continuous column, newest first, no per-entry pages.
// ---------------------------------------------------------------------
export function useChronicle() {
  return useQuery({
    queryKey: ["chronicle"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<ChronicleLine>((from, to) =>
        api()
          .from("chronicle_lines")
          .select("*")
          .order("line_on", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      ),
  });
}

export function useGlossary() {
  return useQuery({
    queryKey: ["glossary"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<GlossaryTerm>((from, to) =>
        api().from("glossary_terms").select("*").order("term").order("id").range(from, to),
      ),
  });
}

// ---------------------------------------------------------------------
// The Record: the deposit number is the canonical address (4.10).
// ---------------------------------------------------------------------
export function useRecordEntry(deposit: string | undefined) {
  return useQuery({
    queryKey: ["record-entry", deposit],
    enabled: Boolean(deposit),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("record_entries")
        .select("*")
        .eq("deposit_number", deposit as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

// ---------------------------------------------------------------------
// Forms. One dynamic dependency, and it fails safe: the caller shows a
// plain line and an alternative address if it is unavailable.
// ---------------------------------------------------------------------
export interface EnquiryInput {
  fullName: string;
  email: string;
  message: string;
  workId?: string;
}

export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: async (input: EnquiryInput) => {
      const { messageId } = await invokeEdgeFunction<{ messageId: string }>(
        "submit-contact-message",
        {
          fullName: input.fullName,
          email: input.email,
          message: input.message,
          ...(input.workId ? { workId: input.workId } : {}),
        },
      );
      return messageId;
    },
  });
}

export interface VoiceIntakeInput {
  writerName: string;
  contact: string;
  aboutName: string;
  place: string;
  note: string;
}

export function useSubmitVoiceIntake() {
  return useMutation({
    mutationFn: async (input: VoiceIntakeInput) => {
      await invokeEdgeFunction<{ ok: true }>("submit-voice-intake", { ...input });
    },
  });
}

// ---------------------------------------------------------------------
// Search: works, people, shows, Papers and other published items, Sattal
// pieces, glossary entries and deposit entries (Build Specification 11.5).
// ---------------------------------------------------------------------
export interface SearchHit {
  kind: string;
  title: string;
  detail: string | null;
  path: string;
}

export function useSearchEverything(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["search-everything", query],
    enabled: query.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("search_everything", { q: query });
      if (error) throw toAppError(error);
      return data ?? [];
    },
  });
}
