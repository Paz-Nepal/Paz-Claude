import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../language";
import { OfferForm } from "./offer-form";
import { useSubmitOffer } from "../api/use-place";

vi.mock("@/lib/supabase", () => ({ supabase: { schema: () => ({ rpc: vi.fn() }) } }));
vi.mock("../api/use-place", () => ({ useSubmitOffer: vi.fn() }));
vi.mock("../api/use-site", () => ({ useSiteInfo: () => ({ data: {} }) }));
const mockedUseSubmitOffer = vi.mocked(useSubmitOffer);

function setup(state: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  mockedUseSubmitOffer.mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...state,
  } as unknown as ReturnType<typeof useSubmitOffer>);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LanguageProvider lang="en">
          <OfferForm
            kind="table"
            asks={[
              { key: "ref.held_on", label: "offer.table-date", type: "date", required: true },
              { key: "subject", label: "offer.table-place", required: true },
              { key: "note", label: "offer.table-line", type: "textarea" },
            ]}
          />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return mutate;
}

describe("OfferForm", () => {
  it("will not send until the name, the way to reach you and every required answer are given", () => {
    setup();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("sends the kind, the free fields, and the answers kept under ref", () => {
    const mutate = setup();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: " Far Away " } });
    fireEvent.change(screen.getByLabelText("How to reach you"), {
      target: { value: "far@example.test" },
    });
    fireEvent.change(screen.getByLabelText("The date it was kept"), {
      target: { value: "2026-02-02" },
    });
    fireEvent.change(screen.getByLabelText("The place"), { target: { value: "Toronto" } });
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeEnabled();
    fireEvent.click(send);

    expect(mutate).toHaveBeenCalledWith({
      kind: "table",
      name: "Far Away",
      contact: "far@example.test",
      subject: "Toronto",
      note: undefined,
      ref: { held_on: "2026-02-02" },
    });
  });

  it("says it has been received once sent", () => {
    setup({ isSuccess: true });
    expect(screen.getByText("Received.")).toBeInTheDocument();
  });
});
