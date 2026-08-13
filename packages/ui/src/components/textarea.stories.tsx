import { Textarea } from "./textarea";

export const Basic = () => (
  <div className="flex max-w-sm flex-col gap-3">
    <Textarea placeholder="Tell us why…" />
    <Textarea placeholder="Disabled" disabled />
  </div>
);
