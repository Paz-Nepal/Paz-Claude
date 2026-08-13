import { Badge } from "./badge";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
);
