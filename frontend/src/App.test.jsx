import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./pages/Landing/LandingPage.jsx", () => ({
  default: () => <div>Landing page</div>,
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
    expect(screen.queryByText("Unknown account state.")).not.toBeInTheDocument();
  });
});
