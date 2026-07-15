import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toAppError } from "@paz/types";

export function useMfaEnroll() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useMfaVerifyEnrollment() {
  return useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw toAppError(challengeError);

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw toAppError(error);
      return data;
    },
  });
}
