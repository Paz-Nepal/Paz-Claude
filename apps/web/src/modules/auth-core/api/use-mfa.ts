import { useMutation, useQuery } from "@tanstack/react-query";
import type { AuthMFAEnrollTOTPResponse, Factor } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toAppError } from "@paz/types";

type Enrolment = NonNullable<AuthMFAEnrollTOTPResponse["data"]>;

/**
 * The enrollment screen needs to know, before it does anything else, whether
 * this account already has a confirmed authenticator: if it does, the screen
 * asks for that app's code instead of enrolling a second one. Also surfaces
 * any abandoned (never-confirmed) factor so the caller can clear it first.
 */
export function useMfaFactors() {
  return useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw toAppError(error);
      return data;
    },
  });
}

// A reload, or React running the effect twice in development, would
// otherwise start two enrollments at once, so concurrent calls share one.
let inflight: Promise<Enrolment> | null = null;

async function startEnrollment(abandoned: Factor[]): Promise<Enrolment> {
  // Any earlier attempt that was never confirmed is abandoned. Left in place,
  // each one blocks the next (the same friendly name cannot be enrolled twice).
  for (const factor of abandoned) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw toAppError(error);
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString()}`,
  });
  if (error) throw toAppError(error);
  return data;
}

export function useMfaEnroll() {
  return useMutation({
    mutationFn: async (abandoned: Factor[]) => {
      inflight ??= startEnrollment(abandoned).finally(() => {
        inflight = null;
      });
      return inflight;
    },
  });
}

/** Confirms a 6-digit code against a factor — a freshly enrolled one, or an
 * existing confirmed one being used to reach aal2 at sign-in. */
export function useMfaVerify() {
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
