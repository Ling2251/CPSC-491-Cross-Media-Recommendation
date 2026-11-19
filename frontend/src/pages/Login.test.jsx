import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Login from "./Login";

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("persists the token when Stay logged in is checked", async () => {
    const onLogin = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "login-token",
          user: { id: 2, account_state: "ACTIVE" },
        }),
      })
    );

    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Stay logged in" }));
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Login successful!")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("login-token");
    expect(localStorage.getItem("crossmedia-stay-logged-in")).toBe("true");
    expect(onLogin).toHaveBeenCalledWith({
      id: 2,
      account_state: "ACTIVE",
    });
  });

  test("does not persist the remember choice by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "login-token",
          user: { id: 2, account_state: "ACTIVE" },
        }),
      })
    );

    render(<Login onLogin={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Login successful!")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBe("login-token");
    expect(localStorage.getItem("crossmedia-stay-logged-in")).toBeNull();
  });
});
