import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents } from "@paz/utils";
import { applicationSchema, type ApplicationInput } from "../schemas";
import { useMembershipTiers, useSubmitApplication } from "../api/use-membership";

export function ApplicationForm() {
  const tiers = useMembershipTiers();
  const submit = useSubmitApplication();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      tierKey: "",
      motivation: "",
      dispatchOptIn: false,
      programsOptIn: false,
    },
  });

  const onSubmit = handleSubmit((values) => {
    submit.mutate({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || null,
      tierKey: values.tierKey,
      motivation: values.motivation || null,
      communicationPreferences: {
        dispatch: values.dispatchOptIn,
        programs: values.programsOptIn,
      },
    });
  });

  if (submit.isSuccess) {
    return (
      <StatePanel
        title="Thank you — your application is in."
        description="A member of staff will be in touch once it's been reviewed."
      />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="Optional." error={errors.phone?.message}>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Tier</legend>
        {errors.tierKey && <p className="text-destructive text-sm">{errors.tierKey.message}</p>}
        <div className="flex flex-col gap-2">
          {(tiers.data ?? []).map((tier) => (
            <label
              key={tier.key}
              className="has-[:checked]:border-ring flex cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <input
                type="radio"
                value={tier.key ?? ""}
                className="mt-1"
                {...register("tierKey")}
              />
              <span className="flex flex-col">
                <span className="font-medium">
                  {tier.name} —{" "}
                  {tier.annual_fee_cents != null ? formatCents(tier.annual_fee_cents) : ""}
                  /year
                </span>
                {tier.description && (
                  <span className="text-muted-foreground text-sm">{tier.description}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label="Why do you want to join?"
        htmlFor="motivation"
        hint="Optional."
        error={errors.motivation?.message}
      >
        <Textarea id="motivation" {...register("motivation")} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Stay in touch</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("dispatchOptIn")} />
          Send me the Dispatch by email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("programsOptIn")} />
          Send me programme announcements by email
        </label>
      </fieldset>
      {submit.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(submit.error).message}
        </p>
      )}
      <Button type="submit" loading={submit.isPending}>
        Submit application
      </Button>
    </form>
  );
}
