import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatMoney } from "@paz/utils";
import { pickLang, useLanguage } from "@/modules/site/language";
import { useWording } from "@/modules/site/wording";
import { applicationSchema, type ApplicationInput } from "../schemas";
import { useMembershipTiers, useSubmitApplication } from "../api/use-membership";

export function ApplicationForm() {
  const tiers = useMembershipTiers();
  const submit = useSubmitApplication();
  const w = useWording();
  const { lang } = useLanguage();
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
    return <StatePanel title={w("friends.thanks")} description={w("friends.thanks-note")} />;
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
      <Field label={w("friends.full-name")} htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
      </Field>
      <Field label={w("friends.email")} htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>
      <Field
        label={w("friends.phone")}
        htmlFor="phone"
        hint={w("friends.optional")}
        error={errors.phone?.message}
      >
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">{w("friends.tier")}</legend>
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
                  {w("friends.tier-line", {
                    name: pickLang(tier.name ?? "", tier.name_ne, lang),
                    price: tier.annual_fee_cents != null ? formatMoney(tier.annual_fee_cents) : "",
                  })}
                </span>
                {tier.description && (
                  <span className="text-muted-foreground text-sm">
                    {pickLang(tier.description, tier.description_ne, lang)}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={w("friends.why")}
        htmlFor="motivation"
        hint={w("friends.optional")}
        error={errors.motivation?.message}
      >
        <Textarea id="motivation" {...register("motivation")} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{w("friends.stay-in-touch")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("dispatchOptIn")} />
          {w("friends.dispatch-opt-in")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("programsOptIn")} />
          {w("friends.programmes-opt-in")}
        </label>
      </fieldset>
      {submit.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(submit.error).message}
        </p>
      )}
      <Button type="submit" loading={submit.isPending}>
        {w("friends.submit")}
      </Button>
    </form>
  );
}
