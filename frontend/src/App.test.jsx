
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";

import {
  MemoryRouter,
  useLocation,
} from "react-router-dom";

import App from "./App";

// Mock application pages so these tests focus
// on authentication and session restoration.

vi.mock("./pages/Landing/LandingPage.jsx", () => ({
  default: ({ onLogin }) => (
    <div>
      <h1>Landing Page</h1>
      <button
        onClick={() =>
          onLogin({
            id: 1,
            name: "Demo User A",
            account_state: "ACTIVE",
          })
        }
      >
        Simulate Login
      </button>
    </div>
  ),
}));

vi.mock("./pages/Dashboard", () => ({
  default: ({ user, onLogout }) => (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {user.name}</p>
      <button onClick={onLogout}>
        Log Out
      </button>
    </div>
  ),
}));

vi.mock("./pages/Login", () => ({
  default: ({ onLogin }) => (
    <div>
      <h1>Login Page</h1>
      <button
        onClick={() =>
          onLogin({
            id: 1,
            name: "Demo User A",
            account_state: "ACTIVE",
          })
        }
      >
        Simulate Login
      </button>
    </div>
  ),
}));

vi.mock("./pages/Onboarding", () => ({
  default: () => <div>Onboarding Page</div>,
}));

vi.mock("./pages/Signup", () => ({
  default: () => <div>Signup Page</div>,
}));

vi.mock("./pages/Friends/FriendsPageApi", () => ({
  default: () => <div>Friends Page</div>,
}));

vi.mock("./pages/FriendSuggestionsPage", () => ({
  default: () => <div>Friend Suggestions</div>,
}));

vi.mock("./pages/ActivityFeed/ActivityFeedPage", () => ({
  default: () => <div>Activity Feed</div>,
}));

vi.mock("./pages/MediaForum/MediaForumPage", () => ({
  default: () => <div>Media Forum</div>,
}));

function LocationDisplay() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
}

function renderApp(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>
  );
}

const mockUser = {
  id: 1,
  name: "Demo User A",
  email: "demoa@example.com",
  account_state: "ACTIVE",
};

describe("App Authentication and Session Restoration", () => {
  beforeEach(() => {
    localStorage.clear();

    vi.stubGlobal("fetch", vi.fn());

    vi.spyOn(console, "error").mockImplementation(
      () => {}
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows login when no session exists", async () => {
    renderApp();

    expect(
      await screen.findByText("Login Page")
    ).toBeInTheDocument();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("restores a valid authenticated session", async () => {
    localStorage.setItem("token", "valid-token");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: mockUser,
      }),
    });

    renderApp();

    expect(
      screen.getByText("Restoring your session...")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Welcome Demo User A")
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/auth/me",
      {
        headers: {
          Authorization: "Bearer valid-token",
        },
      }
    );
  });

  it("removes expired authentication tokens", async () => {
    localStorage.setItem("token", "expired-token");

    fetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    renderApp();

    expect(
      await screen.findByText("Login Page")
    ).toBeInTheDocument();

    expect(
      localStorage.getItem("token")
    ).toBeNull();
  });

  it("rejects invalid sessions", async () => {
    localStorage.setItem("token", "invalid-token");

    fetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    renderApp();

    expect(
      await screen.findByText("Login Page")
    ).toBeInTheDocument();

    expect(
      localStorage.getItem("token")
    ).toBeNull();
  });

  it("preserves tokens during temporary network failures", async () => {
    localStorage.setItem("token", "existing-token");

    fetch.mockRejectedValue(
      new Error("Network unavailable")
    );

    renderApp();

    expect(
      await screen.findByText("Login Page")
    ).toBeInTheDocument();

    expect(
      localStorage.getItem("token")
    ).toBe("existing-token");
  });

  it("restores the correct account information", async () => {
    localStorage.setItem("token", "valid-token");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: mockUser,
      }),
    });

    renderApp();

    expect(
      await screen.findByText("Welcome Demo User A")
    ).toBeInTheDocument();
  });

  it("handles missing user information", async () => {
    localStorage.setItem("token", "valid-token");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
      }),
    });

    renderApp();

    expect(
      await screen.findByText("Login Page")
    ).toBeInTheDocument();
  });

  it("logs out and clears authentication", async () => {
    localStorage.setItem("token", "valid-token");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: mockUser,
      }),
    });

    renderApp();

    expect(
      await screen.findByText("Welcome Demo User A")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Login Page")
      ).toBeInTheDocument();
    });

    expect(
      localStorage.getItem("token")
    ).toBeNull();
  });

  it("renders the landing page", async () => {
    renderApp("/");

    expect(
      screen.getByText("Landing Page")
    ).toBeInTheDocument();
  });

  it("renders the Activity Feed route", async () => {
    renderApp("/activity-feed");

    expect(
      screen.getByText("Activity Feed")
    ).toBeInTheDocument();
  });

  it("renders the Media Forum route", async () => {
    renderApp("/media-forum/1");

    expect(
      screen.getByText("Media Forum")
    ).toBeInTheDocument();
  });

  it("renders the Discover route", async () => {
    renderApp("/discover");

    expect(
      screen.getByRole("heading", { name: /Find your next obsession/i })
    ).toBeInTheDocument();
  });

  it("sends a user who logs in from /login to the dashboard", async () => {
    renderApp("/login");

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate Login" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    });
  });

  it("redirects unknown routes to the homepage", async () => {
    renderApp("/unknown-page");

    await waitFor(() => {
      expect(
        screen.getByTestId("location")
      ).toHaveTextContent("/");
    });
  });
});
