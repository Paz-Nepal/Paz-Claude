import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";
import { invokeEdgeFunction } from "@/lib/edge-functions";

export type ProgramSummary = Database["api"]["Views"]["programs"]["Row"];
export type ProgramSession = Database["api"]["Views"]["program_sessions"]["Row"];
export type AdminProgram = Database["api"]["Views"]["admin_programs"]["Row"];
export type AdminSession = Database["api"]["Views"]["admin_program_sessions"]["Row"];
export type SessionRosterEntry = Database["api"]["Functions"]["session_roster"]["Returns"][number];
export type MyRegistration = Database["api"]["Views"]["my_registrations"]["Row"];
export type Venue = Database["api"]["Views"]["venues"]["Row"];

const api = () => supabase.schema("api");

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them) — same gap documented in modules/publishing/api/use-publishing.ts.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    staleTime: 60_000,
    queryFn: () =>
      selectAll((from, to) =>
        api().from("programs").select("*").order("title").order("id").range(from, to),
      ),
  });
}

export function useProgramSessions(programSlug?: string) {
  return useQuery({
    queryKey: ["program-sessions", programSlug ?? "all"],
    staleTime: 60_000,
    queryFn: () =>
      selectAll((from, to) => {
        let query = api().from("program_sessions").select("*");
        if (programSlug) query = query.eq("program_slug", programSlug);
        return query.order("starts_at").order("id").range(from, to);
      }),
  });
}

export interface RegisterInput {
  sessionId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
}

export function useRegisterForSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      // Routed through the register-for-session Edge Function so the
      // registrant is told whether they got a seat or landed on the
      // waitlist, not just left to check back.
      const { status } = await invokeEdgeFunction<{
        status: Database["programs"]["Enums"]["registration_status"];
      }>("register-for-session", {
        sessionId: input.sessionId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
      });
      return status;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    },
  });
}

export function useMyRegistrations() {
  return useQuery({
    queryKey: ["my-registrations"],
    queryFn: () =>
      selectAll((from, to) =>
        api().from("my_registrations").select("*").order("starts_at").order("id").range(from, to),
      ),
  });
}

export function useCancelMyRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await api().rpc("cancel_my_registration", {
        p_registration: registrationId,
      });
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    },
  });
}

// --- Admin ---------------------------------------------------------------

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () =>
      selectAll((from, to) =>
        api().from("venues").select("*").order("name").order("id").range(from, to),
      ),
  });
}

export function useAdminPrograms() {
  return useQuery({
    queryKey: ["admin-programs"],
    queryFn: () =>
      selectAll((from, to) =>
        api().from("admin_programs").select("*").order("title").order("id").range(from, to),
      ),
  });
}

export function useAdminSessions(programId?: string) {
  return useQuery({
    queryKey: ["admin-sessions", programId ?? "all"],
    enabled: Boolean(programId),
    queryFn: () =>
      selectAll((from, to) =>
        api()
          .from("admin_program_sessions")
          .select("*")
          .eq("program_id", programId as string)
          .order("starts_at")
          .order("id")
          .range(from, to),
      ),
  });
}

export interface SaveProgramInput {
  id: string | null;
  slug: string;
  title: string;
  summary: string | null;
}

/**
 * Standing Specifications, 18 Sept 2026: api.save_program's signature
 * changed (0065, member_only removed -- "Access to the house is never
 * sold... a programme gated to a paid tier contradicts this") after the
 * generated types were last produced, so this uses a hand-written Args
 * type rather than the (now stale) generated one, same reasoning as
 * every other object new or changed since ADR-26.
 */
export function useSaveProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProgramInput) => {
      // The generated overload for this literal name still expects the
      // old (pre-0065) 6-arg shape, so it's bypassed here rather than
      // fought with `asArgs` alone -- that only casts the value, not
      // which overload `.rpc("save_program", ...)` resolves to.
      const client = api();
      const rpc = client.rpc.bind(client) as (
        fn: "save_program",
        args: {
          p_id: string | null;
          p_slug: string;
          p_title: string;
          p_summary: string | null;
          p_description_item: string | null;
        },
      ) => PromiseLike<{ data: string; error: unknown }>;
      const { data, error } = await rpc("save_program", {
        p_id: input.id,
        p_slug: input.slug,
        p_title: input.title,
        p_summary: input.summary,
        p_description_item: null,
      });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export interface SaveSessionInput {
  id: string | null;
  programId: string;
  venueId: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
}

export function useSaveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveSessionInput) => {
      const { data, error } = await api().rpc(
        "save_session",
        asArgs<Database["api"]["Functions"]["save_session"]["Args"]>({
          p_id: input.id,
          p_program_id: input.programId,
          p_venue_id: input.venueId,
          p_starts_at: input.startsAt,
          p_ends_at: input.endsAt,
          p_capacity: input.capacity,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: (_id, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-sessions", input.programId] });
      void queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
    },
  });
}

export function useSessionRoster(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-roster", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const { data, error } = await api().rpc("session_roster", {
        p_session: sessionId as string,
      });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMarkAttendance(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      registrationId,
      attended,
    }: {
      registrationId: string;
      attended: boolean;
    }) => {
      const { error } = await api().rpc("mark_attendance", {
        p_registration: registrationId,
        p_attended: attended,
      });
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session-roster", sessionId] });
    },
  });
}
