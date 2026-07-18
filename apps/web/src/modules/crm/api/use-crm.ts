import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type Organization = Database["api"]["Views"]["organizations"]["Row"];
export type Relationship = Database["api"]["Views"]["relationships"]["Row"];
export type Interaction = Database["api"]["Views"]["interactions"]["Row"];
export type Pledge = Database["api"]["Views"]["pledges"]["Row"];

const api = () => supabase.schema("api");

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them) — same gap documented in modules/publishing/api/use-publishing.ts.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await api().from("organizations").select("*").order("name");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSaveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string | null;
      name: string;
      kind: string | null;
      notes: string | null;
    }) => {
      const { data, error } = await api().rpc(
        "save_organization",
        asArgs<Database["api"]["Functions"]["save_organization"]["Args"]>({
          p_id: input.id,
          p_name: input.name,
          p_kind: input.kind,
          p_notes: input.notes,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useRelationships() {
  return useQuery({
    queryKey: ["relationships"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("relationships")
        .select("*")
        .order("started_on", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveRelationshipInput {
  id: string | null;
  personId: string | null;
  orgId: string | null;
  kind: string;
  ownerPerson: string | null;
  notes: string | null;
}

export function useSaveRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveRelationshipInput) => {
      const { data, error } = await api().rpc(
        "save_relationship",
        asArgs<Database["api"]["Functions"]["save_relationship"]["Args"]>({
          p_id: input.id,
          p_person_id: input.personId,
          p_org_id: input.orgId,
          p_kind: input.kind,
          p_owner_person: input.ownerPerson,
          p_notes: input.notes,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["relationships"] }),
  });
}

export function useEndRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api().rpc("end_relationship", { p_id: id });
      if (error) throw toAppError(error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["relationships"] }),
  });
}

export function useInteractions(relationshipId: string | undefined) {
  return useQuery({
    queryKey: ["interactions", relationshipId],
    enabled: Boolean(relationshipId),
    queryFn: async () => {
      const { data, error } = await api()
        .from("interactions")
        .select("*")
        .eq("relationship_id", relationshipId as string)
        .order("occurred_at", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useLogInteraction(relationshipId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (summary: string) => {
      const { data, error } = await api().rpc("log_interaction", {
        p_relationship_id: relationshipId as string,
        p_summary: summary,
        p_occurred_at: new Date().toISOString(),
      });
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["interactions", relationshipId] }),
  });
}

export function usePledges() {
  return useQuery({
    queryKey: ["pledges"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("pledges")
        .select("*")
        .order("pledged_on", { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSavePledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string | null;
      relationshipId: string;
      pledgedAmountCents: number;
      notes: string | null;
      anonymous: boolean;
    }) => {
      const { data, error } = await api().rpc(
        "save_pledge",
        asArgs<Database["api"]["Functions"]["save_pledge"]["Args"]>({
          p_id: input.id,
          p_relationship_id: input.relationshipId,
          p_pledged_amount_cents: input.pledgedAmountCents,
          p_notes: input.notes,
          p_anonymous: input.anonymous,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pledges"] }),
  });
}

export function useRecordPledgeReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amountCents }: { id: string; amountCents: number }) => {
      const { error } = await api().rpc("record_pledge_receipt", {
        p_id: id,
        p_received_amount_cents: amountCents,
      });
      if (error) throw toAppError(error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pledges"] }),
  });
}

export function useFindPersonByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await api().rpc("find_person_by_email", { p_email: email });
      if (error) throw toAppError(error);
      return data?.[0] ?? null;
    },
  });
}

export function useAcknowledgePledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api().rpc("acknowledge_pledge", { p_id: id });
      if (error) throw toAppError(error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pledges"] }),
  });
}
