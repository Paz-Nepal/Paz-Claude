import { useMutation, useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";
import { invokeEdgeFunction } from "@/lib/edge-functions";

type Views = Database["api"]["Views"];

export type TermsVersion = Views["terms_versions"]["Row"];
export type Hand = Views["hands"]["Row"];
export type GuildMaker = Views["guild_register"]["Row"];
export type TreasuryAccount = Views["treasury_accounts"]["Row"];
export type Encounter = Views["encounters_calendar"]["Row"];

const api = () => supabase.schema("api");
const STALE = 60_000;

export const TERMS_KINDS = ["painters", "writers", "memory", "friends"] as const;
export type TermsKind = (typeof TERMS_KINDS)[number];

export function useTermsVersions() {
  return useQuery({
    queryKey: ["terms-versions"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<TermsVersion>((from, to) =>
        api()
          .from("terms_versions")
          .select("*")
          .order("kind")
          .order("version", { ascending: false })
          .range(from, to),
      ),
  });
}

/** The current version of a terms document: the highest deposited version. */
export function currentTerms(versions: TermsVersion[] | undefined, kind: string) {
  return (versions ?? [])
    .filter((v) => v.kind === kind)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
}

export function useHands() {
  return useQuery({
    queryKey: ["hands"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<Hand>((from, to) =>
        api().from("hands").select("*").order("sort").order("title").range(from, to),
      ),
  });
}

export function useGuildRegister() {
  return useQuery({
    queryKey: ["guild-register"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<GuildMaker>((from, to) =>
        api()
          .from("guild_register")
          .select("*")
          .order("registered_on", { ascending: true })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useTreasuryAccounts() {
  return useQuery({
    queryKey: ["treasury-accounts"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<TreasuryAccount>((from, to) =>
        api()
          .from("treasury_accounts")
          .select("*")
          .order("year_span", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useEncountersCalendar() {
  return useQuery({
    queryKey: ["encounters-calendar"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<Encounter>((from, to) =>
        api()
          .from("encounters_calendar")
          .select("*")
          .order("starts_on", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useEncounter(slug: string | undefined) {
  return useQuery({
    queryKey: ["encounter", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api()
        .from("encounters_calendar")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

// ---------------------------------------------------------------------
// Forms: one dynamic dependency, failing safe.
// ---------------------------------------------------------------------
export function useSubscribeBrief() {
  return useMutation({
    mutationFn: async (email: string) => {
      await invokeEdgeFunction<{ ok: true }>("brief-subscribe", { email });
    },
  });
}

export function useSubmitConcern() {
  return useMutation({
    mutationFn: async (input: { writerName: string; contact: string; body: string }) => {
      await invokeEdgeFunction<{ ok: true }>("submit-concern", { ...input });
    },
  });
}

export function useBriefToken(action: "confirm" | "unsubscribe") {
  return useMutation({
    mutationFn: async (token: string) => {
      await invokeEdgeFunction<{ ok: true }>(
        action === "confirm" ? "brief-confirm" : "brief-unsubscribe",
        { token },
      );
    },
  });
}
