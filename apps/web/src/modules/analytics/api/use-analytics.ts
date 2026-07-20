import { useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type EditorialPipelineRow =
  Database["api"]["Functions"]["editorial_pipeline"]["Returns"][number];
export type ProgramFillRow = Database["api"]["Functions"]["program_fill"]["Returns"][number];
export type MembershipFunnelRow =
  Database["api"]["Functions"]["membership_funnel"]["Returns"][number];
export type ReservationLoadRow =
  Database["api"]["Functions"]["reservation_load"]["Returns"][number];
export type FinanceSummaryRow = Database["api"]["Functions"]["finance_summary"]["Returns"][number];
export type InstitutionVitalsRow =
  Database["api"]["Functions"]["institution_vitals"]["Returns"][number];

const api = () => supabase.schema("api");

/**
 * Every dashboard function is permission-gated in the database itself
 * (analytics.*, checked before the query runs) — a caller without the
 * matching analytics.dashboard.* permission gets a Postgres error, not an
 * empty result, so `enabled` here is purely to avoid firing a request the
 * frontend already knows will be rejected, not the actual security boundary.
 */
export function useEditorialPipeline(enabled: boolean) {
  return useQuery({
    queryKey: ["editorial-pipeline"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("editorial_pipeline");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useProgramFill(enabled: boolean) {
  return useQuery({
    queryKey: ["program-fill"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("program_fill");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMembershipFunnel(enabled: boolean) {
  return useQuery({
    queryKey: ["membership-funnel"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("membership_funnel");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useReservationLoad(enabled: boolean) {
  return useQuery({
    queryKey: ["reservation-load"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("reservation_load");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useFinanceSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["finance-summary"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("finance_summary");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useInstitutionVitals(enabled: boolean) {
  return useQuery({
    queryKey: ["institution-vitals"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await api().rpc("institution_vitals");
      if (error) throw toAppError(error);
      return data;
    },
  });
}
