import { StatePanel } from "./state-panel";

export const Empty = () => (
  <StatePanel title="Nothing here yet." description="New writing will appear here." />
);

export const ErrorState = () => (
  <StatePanel
    title="Something went wrong."
    description="Please try again in a moment."
    reference="a1b2c3"
  />
);
