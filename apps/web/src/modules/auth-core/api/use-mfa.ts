import { useMutation } from "@tanstack/react-query";
import type { AuthMFAEnrollTOTPResponse } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toAppError } from "@paz/types";

type Enrolment = NonNullable<AuthMFAEnrollTOTPResponse["data"]>;

// The enrollment screen starts enrollment when it opens. A reload, or React
// running the effect twice in development, would otherwise start two at once,
// so concurrent calls share one attempt.
let inflight: Promise<Enrolment> | null = null;

async function startEnrollment(): Promise<Enrolment> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw toAppError(listError);

  // A person who already has a working authenticator does not enrol another.
  if ((factors?.totp ?? []).length > 0) {
    throw new Error(
      "This account already has an authenticator app. Sign in again and enter the code it shows.",
    );
  }

  // Any earlier attempt that was never confirmed is abandoned. Left in place,
  // each one blocks the next (the same friendly name cannot be enrolled twice).
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw toAppError(error);
    }
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
    mutationFn: async () => {
      inflight ??= startEnrollment().finally(() => {
        inflight = null;
      });
      return inflight;
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
