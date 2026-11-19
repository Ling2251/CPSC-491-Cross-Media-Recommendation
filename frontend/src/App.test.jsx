import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./pages/DiscoverPage", () => ({
  default: () => <main>Discover page</main>,
}));
vi.mock("./pages/Dashboard", () => ({
  default: () => <h1>User Dashboard</h1>,
}));
vi.mock("./pages/Friends/FriendsPage", () => ({
  default: () => <div>Friends page</div>,
}));
vi.mock("./pages/Login", () => ({
  default: ({ onLogin }) => (
    <button
      type="button"
      onClick={() => onLogin({ id: 1, account_state: "active" })}
    >
      Sign in as active user
    </button>
  ),
}));
vi.mock("./pages/Onboarding", () => ({
  default: () => <div>Onboarding page</div>,
}));
vi.mock("./pages/Signup", () => ({
  default: () => <div>Signup page</div>,
}));
vi.mock("./pages/FriendSuggestionsPage", () => ({
  default: () => <div>Suggestions page</div>,
}));

describe("App account routing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("opens the dashboard for an active account with lowercase state", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in as active user" }));

    expect(
      screen.getByRole("heading", { name: "User Dashboard" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Unknown account state.")
    ).not.toBeInTheDocument();
  });

  test("opens Discover by default without a guest navigation bar", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Discover page")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" })
    ).not.toBeInTheDocument();
  });

  test("shows the requested navigation after login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in as active user" }));

    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });

    expect(within(navigation).getByRole("link", { name: "Friends" }))
      .toHaveAttribute("href", "/friends");
    expect(within(navigation).getByRole("link", { name: "Forum" }))
      .toHaveAttribute("href", "/forums");
    expect(within(navigation).getByRole("link", { name: "Discover" }))
      .toHaveAttribute("href", "/discover");
    expect(within(navigation).getByRole("link", { name: "Profile" }))
      .toHaveAttribute("href", "/profile");
    expect(within(navigation).getAllByRole("link")).toHaveLength(4);
  });

  test("does not render navigation for guests on other routes", () => {
    render(
      <MemoryRouter initialEntries={["/suggestions"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole("navigation", { name: "Main navigation" })
    ).not.toBeInTheDocument();
  });

  test("does not show navigation for an expired stored token", async () => {
    localStorage.setItem("token", "expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole("navigation", { name: "Main navigation" })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
  });

  test("shows navigation after verifying a stored session", async () => {
    localStorage.setItem("token", "valid-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 8, account_state: "ACTIVE" },
        }),
      })
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/profile",
      expect.objectContaining({
        headers: { Authorization: "Bearer valid-token" },
      })
    );
  });
});
