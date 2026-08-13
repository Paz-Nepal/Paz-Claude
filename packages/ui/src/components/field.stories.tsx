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
