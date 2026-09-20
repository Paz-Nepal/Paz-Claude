import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";

type Views = Database["api"]["Views"];

export type AdminPerson = Views["admin_wall_people"]["Row"];
export type AdminWork = Views["admin_wall_works"]["Row"];
export type AdminShow = Views["admin_wall_shows"]["Row"];
export type AdminSattalPiece = Views["admin_sattal_pieces"]["Row"];
export type AdminReader = Views["sattal_readers"]["Row"];
export type AdminChronicleLine = Views["chronicle_lines"]["Row"];
export type AdminVoiceRow = Views["voice_intake"]["Row"];
export type AdminGlossaryTerm = Views["glossary_terms"]["Row"];
export type AdminWorkImage = Views["wall_work_images"]["Row"];
export type AdminWorkEvent = Views["wall_work_events"]["Row"];
export type AdminWorkText = Views["wall_work_texts"]["Row"];

const api = () => supabase.schema("api");

type RpcClient = {
  rpc: (fn: string, args: unknown) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
};

/**
 * The write functions take one jsonb payload (or a few plain arguments).
 * The generated types render that as `Json`, so calls go through this one
 * narrow, named cast instead of scattering casts across the pages.
 */
async function callRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (api() as unknown as RpcClient).rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

function useAdminRpc(fn: string, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Record<string, unknown>) => callRpc(fn, args),
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
  });
}

const ALL_WALL = [
  ["admin-wall-people"],
  ["admin-wall-works"],
  ["admin-wall-shows"],
  ["wall-people"],
  ["wall-works"],
  ["wall-shows"],
];

export const useAdminPeople = () =>
  useQuery({
    queryKey: ["admin-wall-people"],
    queryFn: () =>
      selectAll<AdminPerson>((from, to) =>
        api().from("admin_wall_people").select("*").order("name").order("id").range(from, to),
      ),
  });

export const useAdminWorks = () =>
  useQuery({
    queryKey: ["admin-wall-works"],
    queryFn: () =>
      selectAll<AdminWork>((from, to) =>
        api()
          .from("admin_wall_works")
          .select("*")
          .order("work_number", { ascending: false })
          .range(from, to),
      ),
  });

export const useAdminShows = () =>
  useQuery({
    queryKey: ["admin-wall-shows"],
    queryFn: () =>
      selectAll<AdminShow>((from, to) =>
        api()
          .from("admin_wall_shows")
          .select("*")
          .order("opened_on", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });

export const useAdminSattal = () =>
  useQuery({
    queryKey: ["admin-sattal"],
    queryFn: () =>
      selectAll<AdminSattalPiece>((from, to) =>
        api()
          .from("admin_sattal_pieces")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });

export const useAdminReaders = () =>
  useQuery({
    queryKey: ["sattal-readers"],
    queryFn: () =>
      selectAll<AdminReader>((from, to) =>
        api().from("sattal_readers").select("*").order("appointed_on").order("id").range(from, to),
      ),
  });

export const useAdminChronicle = () =>
  useQuery({
    queryKey: ["chronicle"],
    queryFn: () =>
      selectAll<AdminChronicleLine>((from, to) =>
        api()
          .from("chronicle_lines")
          .select("*")
          .order("line_on", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      ),
  });

export const useVoiceIntake = () =>
  useQuery({
    queryKey: ["voice-intake"],
    queryFn: () =>
      selectAll<AdminVoiceRow>((from, to) =>
        api()
          .from("voice_intake")
          .select("*")
          .order("submitted_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });

export const useAdminGlossary = () =>
  useQuery({
    queryKey: ["glossary"],
    queryFn: () =>
      selectAll<AdminGlossaryTerm>((from, to) =>
        api().from("glossary_terms").select("*").order("term").order("id").range(from, to),
      ),
  });

export function useWorkParts(workId: string | undefined) {
  return useQuery({
    queryKey: ["admin-work-parts", workId],
    enabled: Boolean(workId),
    queryFn: async () => {
      const id = workId as string;
      const [images, events, texts] = await Promise.all([
        selectAll<AdminWorkImage>((from, to) =>
          api()
            .from("wall_work_images")
            .select("*")
            .eq("work_id", id)
            .order("frame")
            .range(from, to),
        ),
        selectAll<AdminWorkEvent>((from, to) =>
          api()
            .from("wall_work_events")
            .select("*")
            .eq("work_id", id)
            .order("occurred_on")
            .order("id")
            .range(from, to),
        ),
        selectAll<AdminWorkText>((from, to) =>
          api().from("wall_work_texts").select("*").eq("work_id", id).order("id").range(from, to),
        ),
      ]);
      return { images, events, texts };
    },
  });
}

export const useSavePerson = () => useAdminRpc("save_person", ALL_WALL);
export const useSaveWork = () => useAdminRpc("save_work", ALL_WALL);
export const useSaveShow = () => useAdminRpc("save_show", ALL_WALL);
export const useSaveWorkImage = () =>
  useAdminRpc("save_work_image", [["admin-work-parts"], ["wall-work-images"]]);
export const useAddWorkEvent = () =>
  useAdminRpc("add_work_event", [["admin-work-parts"], ["wall-work-events"]]);
export const useAddWorkText = () =>
  useAdminRpc("add_work_text", [["admin-work-parts"], ["wall-work-texts"]]);
export const useAddPersonExhibition = () =>
  useAdminRpc("add_person_exhibition", [["wall-person-exhibitions"]]);
export const useAddPersonWriting = () =>
  useAdminRpc("add_person_writing", [["wall-person-writings"]]);
export const useSaveSattalPiece = () =>
  useAdminRpc("save_sattal_piece", [["admin-sattal"], ["sattal-pieces"]]);
export const usePublishSattalPiece = () =>
  useAdminRpc("publish_sattal_piece", [["admin-sattal"], ["sattal-pieces"], ["record-entries"]]);
export const useAddSattalCorrection = () =>
  useAdminRpc("add_sattal_correction", [["sattal-corrections"]]);
export const useSaveReader = () => useAdminRpc("save_outside_reader", [["sattal-readers"]]);
export const useAddChronicleLine = () => useAdminRpc("add_chronicle_line", [["chronicle"]]);
export const useSaveGlossaryTerm = () => useAdminRpc("save_glossary_term", [["glossary"]]);
