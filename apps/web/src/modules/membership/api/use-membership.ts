import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edge-functions";

export type MembershipTier = Database["api"]["Views"]["membership_tiers"]["Row"];
export type MembershipApplication = Database["api"]["Views"]["membership_applications"]["Row"];
export type Member = Database["api"]["Views"]["members"]["Row"];
export type MemberTerm = Database["membership"]["Tables"]["terms"]["Row"];
export type MemberDirectoryEntry = Database["api"]["Views"]["member_directory"]["Row"];

const api = () => supabase.schema("api");

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

/** D-12: the public acceptance step -- the raw token is the entire credential. */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { memberNo } = await invokeEdgeFunction<{ memberNo: string }>(
        "accept-membership-invitation",
        { token },
      );
      return memberNo;
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
  communicationPreferences: { dispatch: boolean; programs: boolean };
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: async (input: SubmitApplicationInput) => {
      // Routed through the submit-membership-application Edge Function so
      // the applicant gets a "we've received it" email on top of the same
      // database write (Architecture Blueprint §8, two-lane design).
      const { applicationId } = await invokeEdgeFunction<{ applicationId: string }>(
        "submit-membership-application",
        {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          tierKey: input.tierKey,
          motivation: input.motivation,
          communicationPreferences: input.communicationPreferences,
        },
      );
      return applicationId;
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
      // Routed through the decide-membership-application Edge Function so
      // the applicant is told the outcome, not just left to check back.
      const { status } = await invokeEdgeFunction<{
        status: Database["membership"]["Enums"]["application_status"];
      }>("decide-membership-application", {
        applicationId: id,
        decision,
        notes,
      });
      return status;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

/**
 * D-12: invites a pending applicant instead of accepting/declining
 * outright. `reissue: true` generates a fresh token for an application
 * already sitting in `invited` (its original link expired) rather than
 * inviting a `pending` one for the first time -- same Edge Function,
 * different underlying RPC (see invite-membership-applicant/index.ts).
 */
export function useInviteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reissue }: { id: string; reissue?: boolean }) => {
      const { invitationId, expiresAt } = await invokeEdgeFunction<{
        invitationId: string;
        expiresAt: string;
      }>("invite-membership-applicant", { applicationId: id, reissue: reissue ?? false });
      return { invitationId, expiresAt };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership-applications"] });
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

/**
 * api.my_membership (0042) isn't in packages/types/src/database.generated.ts
 * -- it's new this session and `pnpm db:types` was never run against a
 * live database (same reason every other 0042+ object is hand-typed
 * here instead). Explicitly self-scoped by person_id, so this returns
 * at most one row even for a staff caller who also happens to be a
 * member -- see the view's own comment for why that matters.
 */
export interface MyMembership {
  id: string;
  member_no: string;
  tier_key: string;
  tier_name: string;
  status: Member["status"];
  joined_on: string;
  card_issued_at: string | null;
}

export function useMyMembership() {
  return useQuery({
    queryKey: ["my-membership"],
    queryFn: async () => {
      const { membership } = await invokeEdgeFunction<{ membership: MyMembership | null }>(
        "get-my-membership",
        {},
      );
      return membership;
    },
  });
}

export interface IssuedCard {
  memberNo: string;
  token: string;
  issuedAt: string;
}

export function useIssueCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return invokeEdgeFunction<IssuedCard>("issue-member-card", {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-membership"] });
    },
  });
}

export interface VerifiedCard {
  found: boolean;
  memberNo?: string;
  memberName?: string;
  tierName?: string;
  status?: string;
  valid?: boolean;
}

export function useVerifyCard() {
  return useMutation({
    mutationFn: async (token: string) => {
      return invokeEdgeFunction<VerifiedCard>("verify-member-card", { token });
    },
  });
}
