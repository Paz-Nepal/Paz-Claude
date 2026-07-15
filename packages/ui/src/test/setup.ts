import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL's automatic afterEach cleanup only self-registers when it detects a
// global test framework; this workspace runs Vitest with `globals: false`,
// so cleanup is wired explicitly instead (otherwise DOM nodes accumulate
// across `it` blocks and `getByRole` queries start matching more than one).
afterEach(() => {
  cleanup();
});
