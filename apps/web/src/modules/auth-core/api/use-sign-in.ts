import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toAppError } from "@paz/types";
import type { SignInInput } from "../schemas";

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw toAppError(error);
      return data;
    },
  });
}
