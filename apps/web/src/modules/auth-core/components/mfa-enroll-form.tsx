import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { mfaChallengeSchema, type MfaChallengeInput } from "../schemas";
import { useMfaEnroll, useMfaVerifyEnrollment } from "../api/use-mfa";

/**
 * Staff MFA enrollment (Architecture Blueprint §8.2 — staff-permission RLS
 * checks require `aal2`). Kicks off TOTP enrollment on mount, shows the QR
 * code + manual-entry secret, then verifies the first code to confirm the
 * factor before letting the person continue.
 */
export function MfaEnrollForm() {
  const navigate = useNavigate();
  const enroll = useMfaEnroll();
  const verify = useMfaVerifyEnrollment();
  const enrollMutate = enroll.mutate;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaChallengeInput>({ resolver: zodResolver(mfaChallengeSchema) });

  React.useEffect(() => {
    enrollMutate();
  }, [enrollMutate]);

  const onSubmit = handleSubmit((values) => {
    if (!enroll.data) return;
    verify.mutate(
      { factorId: enroll.data.id, code: values.code },
      { onSuccess: () => navigate("/admin", { replace: true }) },
    );
  });

  if (enroll.isError) {
    return (
      <StatePanel
        title="Couldn't start MFA enrollment."
        description={toAppError(enroll.error).message}
      />
    );
  }

  if (enroll.isPending || !enroll.data) {
    return <p className="text-muted-foreground p-8">Setting up multi-factor authentication…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        Staff accounts require multi-factor authentication. Scan this code with an authenticator
        app, then enter the 6-digit code it shows.
      </p>
      <img
        src={enroll.data.totp.qr_code}
        alt="Scan this QR code with your authenticator app"
        className="h-48 w-48 self-center"
      />
      <p className="text-muted-foreground text-center text-xs">
        Can&apos;t scan? Enter this key manually:{" "}
        <code className="font-mono">{enroll.data.totp.secret}</code>
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
        <Field label="6-digit code" htmlFor="code" error={errors.code?.message}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-invalid={Boolean(errors.code)}
            {...register("code")}
          />
        </Field>
        {verify.isError && (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(verify.error).message}
          </p>
        )}
        <Button type="submit" loading={verify.isPending}>
          Verify and enable
        </Button>
      </form>
    </div>
  );
}
