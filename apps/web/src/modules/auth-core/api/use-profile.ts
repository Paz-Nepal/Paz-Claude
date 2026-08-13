import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type MyProfile = Database["api"]["Views"]["my_profile"]["Row"];
export interface CommunicationPreferences {
  dispatch: boolean;
  programs: boolean;
}

const api = () => supabase.schema("api");

function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

/** `supabase gen types` renders this column as plain `Json`; every reader
 * shapes it the same way rather than trusting an arbitrary payload. */
export function readCommunicationPreferences(value: unknown): CommunicationPreferences {
  const v = (value ?? {}) as Record<string, unknown>;
  return { dispatch: v["dispatch"] === true, programs: v["programs"] === true };
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api().from("my_profile").select("*").maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface UpdateMyProfileInput {
  displayName: string | null;
  phone: string | null;
  bio: string | null;
  communicationPreferences: CommunicationPreferences;
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      const { data, error } = await api().rpc(
        "update_my_profile",
        asArgs<Database["api"]["Functions"]["update_my_profile"]["Args"]>({
          p_display_name: input.displayName,
          p_phone: input.phone,
          p_bio: input.bio,
          p_communication_preferences: input.communicationPreferences,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
    },
  });
}
