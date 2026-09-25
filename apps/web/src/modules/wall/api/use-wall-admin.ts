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
export async function callRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (api() as unknown as RpcClient).rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

export function useAdminRpc(fn: string, invalidate: string[][]) {
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

// ---------------------------------------------------------------------
// The rest of the house: hands, encounters, treasury, guild, commons,
// dealings, safeguarding and the Brief.
// ---------------------------------------------------------------------
export type AdminRole = Views["admin_roles"]["Row"];
export type AdminEncounter = Views["admin_encounters"]["Row"];
export type AdminTreasuryAccount = Views["admin_treasury_accounts"]["Row"];
export type AdminGuildMaker = Views["admin_guild_makers"]["Row"];
export type CommonsRow = Views["commons_register"]["Row"];
export type CommonsTable = Views["commons_tables_kept"]["Row"];
export type CommonsAssembly = Views["commons_assemblies"]["Row"];
export type AdminDealing = Views["admin_dealings"]["Row"];
export type AdminWorkTerms = Views["admin_work_terms"]["Row"];
export type SattalLedgerRow = Views["sattal_ledger"]["Row"];
export type ConcernRow = Views["concerns"]["Row"];

const list = <T>(view: string, order: string, key: string[]) =>
  selectAll<T>((from, to) => {
    let q = api()
      .from(view as never)
      .select("*") as unknown as {
      order: (c: string, o?: { ascending: boolean }) => typeof q;
      range: (
        a: number,
        b: number,
      ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
    };
    q = q.order(order, { ascending: false });
    for (const k of key) q = q.order(k);
    return q.range(from, to);
  });

export const useAdminRoles = () =>
  useQuery({
    queryKey: ["admin-roles"],
    queryFn: () =>
      selectAll<AdminRole>((from, to) =>
        api().from("admin_roles").select("*").order("sort").order("id").range(from, to),
      ),
  });
export const useAdminEncounters = () =>
  useQuery({
    queryKey: ["admin-encounters"],
    queryFn: () => list<AdminEncounter>("admin_encounters", "starts_on", ["id"]),
  });
export const useAdminTreasury = () =>
  useQuery({
    queryKey: ["admin-treasury"],
    queryFn: () => list<AdminTreasuryAccount>("admin_treasury_accounts", "year_span", ["id"]),
  });
export const useAdminGuild = () =>
  useQuery({
    queryKey: ["admin-guild"],
    queryFn: () =>
      selectAll<AdminGuildMaker>((from, to) =>
        api()
          .from("admin_guild_makers")
          .select("*")
          .order("person_name")
          .order("id")
          .range(from, to),
      ),
  });
export const useCommonsRegister = () =>
  useQuery({
    queryKey: ["commons-register"],
    queryFn: () =>
      selectAll<CommonsRow>((from, to) =>
        api().from("commons_register").select("*").order("rung").order("person_id").range(from, to),
      ),
  });
export const useCommonsTables = () =>
  useQuery({
    queryKey: ["commons-tables"],
    queryFn: () => list<CommonsTable>("commons_tables_kept", "held_on", ["id"]),
  });
export const useCommonsAssemblies = () =>
  useQuery({
    queryKey: ["commons-assemblies"],
    queryFn: () => list<CommonsAssembly>("commons_assemblies", "held_on", ["id"]),
  });
export const useAdminDealings = () =>
  useQuery({
    queryKey: ["admin-dealings"],
    queryFn: () => list<AdminDealing>("admin_dealings", "created_at", ["id"]),
  });
export const useWorkTermsRows = () =>
  useQuery({
    queryKey: ["admin-work-terms"],
    queryFn: () =>
      selectAll<AdminWorkTerms>((from, to) =>
        api().from("admin_work_terms").select("*").order("work_id").range(from, to),
      ),
  });
export const useSattalLedger = () =>
  useQuery({
    queryKey: ["sattal-ledger"],
    queryFn: () =>
      selectAll<SattalLedgerRow>((from, to) =>
        api().from("sattal_ledger").select("*").order("piece_id").range(from, to),
      ),
  });
export const useConcerns = () =>
  useQuery({
    queryKey: ["concerns"],
    queryFn: () => list<ConcernRow>("concerns", "submitted_at", ["id"]),
  });

export const useSaveRole = () => useAdminRpc("save_role", [["admin-roles"], ["hands"]]);
export const useSaveEncounter = () =>
  useAdminRpc("save_encounter", [["admin-encounters"], ["encounters-calendar"]]);
export const useSaveTreasury = () =>
  useAdminRpc("save_treasury_account", [["admin-treasury"], ["treasury-accounts"]]);
export const useSaveGuildMaker = () =>
  useAdminRpc("save_guild_maker", [["admin-guild"], ["guild-register"], ["admin-wall-people"]]);
export const useRecordPunchDestruction = () =>
  useAdminRpc("record_punch_destruction", [["admin-guild"], ["guild-register"]]);
export const useSaveCommonsPerson = () =>
  useAdminRpc("save_commons_person", [["commons-register"]]);
export const useReportTableKept = () => useAdminRpc("report_table_kept", [["commons-tables"]]);
export const useConfirmTableKept = () =>
  useAdminRpc("confirm_table_kept", [["commons-tables"], ["chronicle"]]);
export const useSaveAssembly = () => useAdminRpc("save_assembly", [["commons-assemblies"]]);
export const useSaveDealing = () => useAdminRpc("save_dealing", [["admin-dealings"]]);
export const useRecordDealingStage = () =>
  useAdminRpc("record_dealing_stage", [
    ["admin-dealings"],
    ["admin-wall-works"],
    ["admin-work-parts"],
  ]);
export const useSaveWorkTerms = () => useAdminRpc("save_work_terms", [["admin-work-terms"]]);
export const useSaveSattalLedger = () => useAdminRpc("save_sattal_ledger", [["sattal-ledger"]]);

/** Staff-only reads that return rows through a function rather than a view. */
export function useConcurrenceRoll(year: number) {
  return useQuery({
    queryKey: ["concurrence-roll", year],
    queryFn: async () =>
      callRpc<
        Array<{ person_id: string; name: string; roll_size: number; folds_into_assembly: boolean }>
      >("concurrence_roll", { p_year: year }),
  });
}
export function useAssemblyReadiness() {
  return useQuery({
    queryKey: ["assembly-readiness"],
    queryFn: async () =>
      callRpc<
        Array<{
          denizens: number;
          adopted_on: string | null;
          five_years_on: string | null;
          ready: boolean;
        }>
      >("assembly_readiness", {}),
  });
}

/** The CRM's own lookup: a person is found by the email they gave. */
export async function findPersonByEmail(
  email: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await callRpc<Array<{ id: string; display_name: string }> | null>(
    "find_person_by_email",
    { p_email: email },
  );
  const row = rows?.[0];
  return row ? { id: row.id, name: row.display_name } : null;
}
