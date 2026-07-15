import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Badge } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useAuthorization } from "@/modules/auth-core";
import { registerSchema, type RegisterFormInput } from "../schemas";
import { useRegisterForSession, type ProgramSession } from "../api/use-programs";

export function SessionRegisterCard({ session }: { session: ProgramSession }) {
  const { signedIn } = useAuthorization();
  const [expanded, setExpanded] = React.useState(false);
  const register = useRegisterForSession();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  const seatsLeft =
    session.capacity != null && session.registered_count != null
      ? session.capacity - session.registered_count
      : null;
  const full = seatsLeft !== null && seatsLeft <= 0;

  const registerSignedIn = () => {
    if (!session.id) return;
    register.mutate({ sessionId: session.id, fullName: null, email: null, phone: null });
  };

  const onSubmit = handleSubmit((values) => {
    if (!session.id) return;
    register.mutate({
      sessionId: session.id,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || null,
    });
  });

  if (register.isSuccess) {
    return (
      <div className="rounded-lg border p-4">
        <p className="font-medium">
          {session.starts_at ? formatKathmanduTime(session.starts_at) : ""}
        </p>
        <p className="text-foreground mt-2 text-sm">
          {register.data === "waitlisted"
            ? "You're on the waitlist — we'll let you know if a seat opens up."
            : "You're registered."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {session.starts_at ? formatKathmanduTime(session.starts_at) : ""}
          </p>
          {session.venue_name && (
            <p className="text-muted-foreground text-sm">{session.venue_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session.member_only && <Badge variant="secondary">Members only</Badge>}
          {full ? (
            <Badge variant="outline">Waitlist</Badge>
          ) : (
            seatsLeft !== null && (
              <span className="text-muted-foreground text-sm">{seatsLeft} seats left</span>
            )
          )}
        </div>
      </div>

      {!expanded && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => (signedIn ? registerSignedIn() : setExpanded(true))}
          loading={signedIn && register.isPending}
        >
          {full ? "Join waitlist" : "Register"}
        </Button>
      )}

      {expanded && !signedIn && (
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3" noValidate>
          <Field label="Full name" htmlFor={`name-${session.id}`} error={errors.fullName?.message}>
            <Input id={`name-${session.id}`} {...registerField("fullName")} />
          </Field>
          <Field label="Email" htmlFor={`email-${session.id}`} error={errors.email?.message}>
            <Input id={`email-${session.id}`} type="email" {...registerField("email")} />
          </Field>
          <Field label="Phone" htmlFor={`phone-${session.id}`} hint="Optional.">
            <Input id={`phone-${session.id}`} type="tel" {...registerField("phone")} />
          </Field>
          <Button type="submit" size="sm" loading={register.isPending} className="self-start">
            {full ? "Join waitlist" : "Confirm registration"}
          </Button>
        </form>
      )}

      {register.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(register.error).message}
        </p>
      )}
    </div>
  );
}
