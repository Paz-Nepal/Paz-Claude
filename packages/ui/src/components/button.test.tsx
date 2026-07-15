import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children as the accessible name", () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("keeps the accessible name stable while loading (regression: legacy version swapped label to 'Loading...')", () => {
    render(<Button loading>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("disables the button and blocks interaction when disabled", () => {
    render(<Button disabled>Save changes</Button>);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("renders as its child via asChild without crashing Radix Slot (regression: loading's falsy sibling node broke Slot's single-child requirement)", () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });
});
