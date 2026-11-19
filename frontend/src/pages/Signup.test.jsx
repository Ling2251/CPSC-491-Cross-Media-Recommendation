import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import Login from "./Login";
import Signup from "./Signup";

describe("Signup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("creates the account and continues to login with the email prefilled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Account created successfully" }),
      })
    );

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login onLogin={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Demo User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Your account is ready. Log in to continue."))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("demo@example.com");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Demo User",
          email: "demo@example.com",
          password: "password",
        }),
      })
    );
  });
});
