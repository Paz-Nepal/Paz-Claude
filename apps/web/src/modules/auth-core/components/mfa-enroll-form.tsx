import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { mfaChallengeSchema, type MfaChallengeInput } from "../schemas";
import { useMfaEnroll, useMfaFactors, useMfaVerify } from "../api/use-mfa";

/**
 * Staff MFA (Architecture Blueprint §8.2 — staff-permission RLS checks
 * require `aal2`). A session lands here whenever it hasn't reached aal2, so
 * this covers two different people: one setting up an authenticator for the
 * first time, and one who already has a confirmed authenticator but hasn't
 * entered its code yet this session. It looks up the account's factors first
 * to tell which one it's talking to, rather than assuming "enroll."
 */
export function MfaEnrollForm() {
  const navigate = useNavigate();
  const factors = useMfaFactors();
  const enroll = useMfaEnroll();
  const verify = useMfaVerify();
  const enrollMutate = enroll.mutate;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaChallengeInput>({ resolver: zodResolver(mfaChallengeSchema) });

  const confirmedFactor = factors.data?.totp.find((f) => f.status === "verified");
  const abandonedFactors = (factors.data?.all ?? []).filter(
    (f) => f.factor_type === "totp" && f.status === "unverified",
  );

  React.useEffect(() => {
    // Nothing to enroll until we know whether a confirmed factor already
    // exists — enrolling anyway would just be refused as a duplicate.
    if (!factors.data || confirmedFactor) return;
    enrollMutate(abandonedFactors);
    // abandonedFactors and confirmedFactor are derived from factors.data on
    // every render; only re-run this effect when factors.data itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factors.data, enrollMutate]);

  const onSubmit = handleSubmit((values) => {
    const factorId = confirmedFactor?.id ?? enroll.data?.id;
    if (!factorId) return;
    verify.mutate(
      { factorId, code: values.code },
      { onSuccess: () => navigate("/admin", { replace: true }) },
    );
  });

  if (factors.isError) {
    return (
      <StatePanel
        title="Couldn't start MFA enrollment."
        description={toAppError(factors.error).message}
      />
    );
  }

  if (enroll.isError) {
    return (
      <StatePanel
        title="Couldn't start MFA enrollment."
        description={toAppError(enroll.error).message}
      />
    );
  }

  if (factors.isPending || (!confirmedFactor && (enroll.isPending || !enroll.data))) {
    return <p className="text-muted-foreground p-8">Setting up multi-factor authentication…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {confirmedFactor ? (
        <p className="text-muted-foreground text-sm">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            Staff accounts require multi-factor authentication. Scan this code with an
            authenticator app, then enter the 6-digit code it shows.
          </p>
          <img
            src={enroll.data?.totp.qr_code}
            alt="Scan this QR code with your authenticator app"
            className="h-48 w-48 self-center"
          />
          <p className="text-muted-foreground text-center text-xs">
            Can&apos;t scan? Enter this key manually:{" "}
            <code className="font-mono">{enroll.data?.totp.secret}</code>
          </p>
        </>
      )}
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
