import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";

export const Basic = () => (
  <div className="flex max-w-sm flex-col gap-6">
    <Field label="Full name" htmlFor="story-field-name">
      <Input id="story-field-name" />
    </Field>
    <Field label="Phone" htmlFor="story-field-phone" hint="Optional.">
      <Input id="story-field-phone" type="tel" />
    </Field>
    <Field label="Motivation" htmlFor="story-field-motivation" error="This field is required.">
      <Textarea id="story-field-motivation" aria-invalid="true" />
    </Field>
  </div>
);

/**
 * ADR-28's "still open" note: Basic above hardcodes its error string as a
 * prop, which only proves Field can display an error -- not that it
 * behaves correctly wired to a real form library's validation lifecycle
 * (error appears on submit, clears as the field is corrected,
 * `aria-invalid` tracks `formState`). This uses the same
 * react-hook-form + zod + @hookform/resolvers stack apps/web's real forms
 * use (e.g. the membership application), against a schema shaped like a
 * real one of those forms, not a toy example.
 */
const schema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
});
type FormValues = z.infer<typeof schema>;

export const WithFormValidation = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form
      className="flex max-w-sm flex-col gap-6"
      onSubmit={handleSubmit(() => {
        // Real submission has nowhere to go in a story -- proving
        // validation blocks/allows submit is the point, not the result.
      })}
      noValidate
    >
      <Field label="Full name" htmlFor="story-field-rhf-name" error={errors.fullName?.message}>
        <Input
          id="story-field-rhf-name"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
      </Field>
      <Field label="Email" htmlFor="story-field-rhf-email" error={errors.email?.message}>
        <Input
          id="story-field-rhf-email"
          type="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>
      <Button type="submit" className="self-start">
        Submit (try it empty, then fix it)
      </Button>
    </form>
  );
};
