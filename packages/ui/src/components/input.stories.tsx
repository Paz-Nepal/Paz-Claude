import { Input } from "./input";

export const Basic = () => (
  <div className="flex max-w-sm flex-col gap-3">
    <Input placeholder="Type here…" />
    <Input placeholder="Disabled" disabled />
    <Input placeholder="Invalid" aria-invalid="true" />
  </div>
);
