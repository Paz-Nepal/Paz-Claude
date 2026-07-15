import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SignInForm } from "./sign-in-form";
import { useSignIn } from "../api/use-sign-in";

vi.mock("../api/use-sign-in", () => ({ useSignIn: vi.fn() }));
const mockedUseSignIn = vi.mocked(useSignIn);

describe("SignInForm", () => {
  it("shows validation errors and never calls mutate when submitted empty", async () => {
    const mutate = vi.fn();
    mockedUseSignIn.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSignIn>);

    render(
      <MemoryRouter>
        <SignInForm />
      </MemoryRouter>,
    );

    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
