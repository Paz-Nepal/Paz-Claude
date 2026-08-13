import { Button } from "./button";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="danger">Danger</Button>
    <Button variant="ghost">Ghost</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const Loading = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button loading>Saving…</Button>
    <Button variant="secondary" loading>
      Saving…
    </Button>
  </div>
);

export const Disabled = () => <Button disabled>Can&rsquo;t submit yet</Button>;
