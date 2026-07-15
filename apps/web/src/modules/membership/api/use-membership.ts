import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type MembershipTier = Database["api"]["Views"]["membership_tiers"]["Row"];
export type MembershipApplication = Database["api"]["Views"]["membership_applications"]["Row"];
export type Member = Database["api"]["Views"]["members"]["Row"];
export type MemberTerm = Database["membership"]["Tables"]["terms"]["Row"];
export type MemberDirectoryEntry = Database["api"]["Views"]["member_directory"]["Row"];

const api = () => supabase.schema("api");

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them) — same gap documented in modules/publishing/api/use-publishing.ts.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

export function useMembershipTiers() {
  return useQuery({
    queryKey: ["membership-tiers"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api()
        .from("membership_tiers")
        .select("*")
        .order("annual_fee_cents");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMemberDirectory() {
  return useQuery({
    queryKey: ["member-directory"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api()
        .from("member_directory")
        .select("*")
        .order("display_name");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SubmitApplicationInput {
  fullName: string;
  email: string;
  phone: string | null;
  tierKey: string;
  motivation: string | null;
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: async (input: SubmitApplicationInput) => {
      const { data, error } = await api().rpc(
        "submit_membership_application",
        asArgs<Database["api"]["Functions"]["submit_membership_application"]["Args"]>({
          p_full_name: input.fullName,
          p_email: input.email,
          p_phone: input.phone,
          p_tier_key: input.tierKey,
          p_motivation: input.motivation,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ["membership-applications"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("membership_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useDecideApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: "accepted" | "declined";
      notes: string | null;
    }) => {
      const { data, error } = await api().rpc(
        "decide_membership_application",
        asArgs<Database["api"]["Functions"]["decide_membership_application"]["Args"]>({
          p_application: id,
          p_decision: decision,
          p_notes: notes,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await api().from("members").select("*").order("member_no");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMemberTerms(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-terms", memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const { data, error } = await api().rpc("member_terms", { p_member: memberId as string });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSetMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Member["status"] }) => {
      const { data, error } = await api().rpc("set_member_status", {
        p_member: id,
        p_status: status as string,
      });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useRecordPayment(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ termId, amountCents }: { termId: string; amountCents: number }) => {
      const { data, error } = await api().rpc("record_payment", {
        p_term: termId,
        p_amount_cents: amountCents,
      });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["member-terms", memberId] });
    },
  });
}
