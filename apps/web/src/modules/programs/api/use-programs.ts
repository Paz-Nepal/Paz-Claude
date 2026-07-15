import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

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
    queryFn: async () => {
      const { data, error } = await api().from("programs").select("*").order("title");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useProgramSessions(programSlug?: string) {
  return useQuery({
    queryKey: ["program-sessions", programSlug ?? "all"],
    staleTime: 60_000,
    queryFn: async () => {
      let query = api().from("program_sessions").select("*").order("starts_at");
      if (programSlug) query = query.eq("program_slug", programSlug);
      const { data, error } = await query;
      if (error) throw toAppError(error);
      return data;
    },
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
      const { data, error } = await api().rpc(
        "register_for_session",
        asArgs<Database["api"]["Functions"]["register_for_session"]["Args"]>({
          p_session: input.sessionId,
          p_full_name: input.fullName,
          p_email: input.email,
          p_phone: input.phone,
        }),
      );
      if (error) throw toAppError(error);
      return data;
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
    queryFn: async () => {
      const { data, error } = await api().from("my_registrations").select("*").order("starts_at");
      if (error) throw toAppError(error);
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await api().from("venues").select("*").order("name");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useAdminPrograms() {
  return useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () => {
      const { data, error } = await api().from("admin_programs").select("*").order("title");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useAdminSessions(programId?: string) {
  return useQuery({
    queryKey: ["admin-sessions", programId ?? "all"],
    enabled: Boolean(programId),
    queryFn: async () => {
      const { data, error } = await api()
        .from("admin_program_sessions")
        .select("*")
        .eq("program_id", programId as string)
        .order("starts_at");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveProgramInput {
  id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  memberOnly: boolean;
}

export function useSaveProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProgramInput) => {
      const { data, error } = await api().rpc(
        "save_program",
        asArgs<Database["api"]["Functions"]["save_program"]["Args"]>({
          p_id: input.id,
          p_slug: input.slug,
          p_title: input.title,
          p_summary: input.summary,
          p_member_only: input.memberOnly,
          p_description_item: null,
        }),
      );
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
