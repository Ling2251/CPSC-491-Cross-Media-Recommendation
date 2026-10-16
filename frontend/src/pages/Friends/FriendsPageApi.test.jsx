
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import FriendsPageApi from "./FriendsPageApi";
import { friendshipApi } from "../../services/friendshipApi";

// Mock the API client so these tests do not require
// Express or a real PostgreSQL database.
vi.mock("../../services/friendshipApi", () => ({
  friendshipApi: {
    getFriends: vi.fn(),
    getIncomingRequests: vi.fn(),
    getOutgoingRequests: vi.fn(),
    sendRequest: vi.fn(),
    acceptRequest: vi.fn(),
    declineRequest: vi.fn(),
    cancelRequest: vi.fn(),
    removeFriend: vi.fn(),
  },
}));

const acceptedFriendship = {
  id: 10,
  requesterId: 1,
  receiverId: 2,
  status: "ACCEPTED",
};

const incomingRequest = {
  id: 11,
  requesterId: 3,
  receiverId: 1,
  status: "PENDING",
};

const outgoingRequest = {
  id: 12,
  requesterId: 1,
  receiverId: 4,
  status: "PENDING",
};

// Mock the protected /api/profile endpoint.
function mockProfile(userId = 1) {
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      user: {
        id: userId,
        name: "Test User",
      },
    }),
  });
}

// Set up friendship data returned by the API.
function mockFriendshipLists({
  friends = [acceptedFriendship],
  incoming = [incomingRequest],
  outgoing = [outgoingRequest],
} = {}) {
  friendshipApi.getFriends.mockResolvedValue(friends);
  friendshipApi.getIncomingRequests.mockResolvedValue(incoming);
  friendshipApi.getOutgoingRequests.mockResolvedValue(outgoing);
}

// Wait until all three sections have loaded.
async function waitForPage() {
  await screen.findByText("User #2");
}

describe("FriendsPageApi - React Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    localStorage.clear();
    localStorage.setItem("token", "test-jwt-token");

    vi.stubGlobal("fetch", vi.fn());

    mockProfile();
    mockFriendshipLists();

    friendshipApi.acceptRequest.mockResolvedValue({
      success: true,
    });

    friendshipApi.declineRequest.mockResolvedValue({
      success: true,
    });

    friendshipApi.cancelRequest.mockResolvedValue({
      success: true,
    });

    friendshipApi.removeFriend.mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  // ==========================================
  // 1. LOADING STATE
  // ==========================================

  test("displays a loading state while fetching data", async () => {
    let resolveProfile;

    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve;
        })
    );

    render(<FriendsPageApi />);

    expect(
      screen.getByText("Loading your friendships...")
    ).toBeInTheDocument();

    resolveProfile({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 1, name: "Test User" },
      }),
    });

    await waitForPage();

    expect(
      screen.queryByText("Loading your friendships...")
    ).not.toBeInTheDocument();
  });

  // ==========================================
  // 2. MISSING AUTHENTICATION
  // ==========================================

  test("requires the user to log in", async () => {
    localStorage.removeItem("token");

    render(<FriendsPageApi />);

    expect(
      await screen.findByText(
        "Please log in before accessing your friends."
      )
    ).toBeInTheDocument();

    expect(fetch).not.toHaveBeenCalled();

    expect(
      friendshipApi.getFriends
    ).not.toHaveBeenCalled();
  });

  // ==========================================
  // 3. EXPIRED SESSION
  // ==========================================

  test("handles expired authentication", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        message: "Invalid token",
      }),
    });

    render(<FriendsPageApi />);

    expect(
      await screen.findByText(
        "Your session has expired. Please log in again."
      )
    ).toBeInTheDocument();

    expect(
      friendshipApi.getFriends
    ).not.toHaveBeenCalled();
  });

  // ==========================================
  // 4. INVALID PROFILE
  // ==========================================

  test("rejects invalid profile information", async () => {
    mockProfile(null);

    render(<FriendsPageApi />);

    expect(
      await screen.findByText(
        "Invalid user information."
      )
    ).toBeInTheDocument();
  });

  // ==========================================
  // 5. DISPLAY FRIENDSHIPS
  // ==========================================

  test("displays accepted, incoming, and outgoing friendships", async () => {
    render(<FriendsPageApi />);

    await waitForPage();

    const friendsSection = screen
      .getByRole("heading", { name: "Your Friends" })
      .closest("section");

    const incomingSection = screen
      .getByRole("heading", { name: "Friend Requests" })
      .closest("section");

    const outgoingSection = screen
      .getByRole("heading", { name: "Sent Requests" })
      .closest("section");

    expect(
      within(friendsSection).getByText("User #2")
    ).toBeInTheDocument();

    expect(
      within(incomingSection).getByText("User #3")
    ).toBeInTheDocument();

    expect(
      within(outgoingSection).getByText("User #4")
    ).toBeInTheDocument();

    expect(
      within(incomingSection).getByRole("button", {
        name: "Accept",
      })
    ).toBeInTheDocument();

    expect(
      within(outgoingSection).getByRole("button", {
        name: "Cancel Request",
      })
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/profile",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-jwt-token",
        },
      })
    );
  });

  // ==========================================
  // 6. EMPTY STATES
  // ==========================================

  test("displays empty states when no friendships exist", async () => {
    mockFriendshipLists({
      friends: [],
      incoming: [],
      outgoing: [],
    });

    render(<FriendsPageApi />);

    expect(
      await screen.findByText("No pending requests")
    ).toBeInTheDocument();

    expect(
      screen.getByText("No friends yet")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "You have no pending outgoing requests."
      )
    ).toBeInTheDocument();
  });

  // ==========================================
  // 7. ACCEPT REQUEST
  // ==========================================

  test("accepts an incoming friend request", async () => {
    const user = userEvent.setup();

    render(<FriendsPageApi />);

    await screen.findByText("User #3");

    await user.click(
      screen.getByRole("button", {
        name: "Accept",
      })
    );

    await waitFor(() => {
      expect(
        friendshipApi.acceptRequest
      ).toHaveBeenCalledWith(11);
    });

    expect(
      await screen.findByText(
        "Friend request accepted."
      )
    ).toBeInTheDocument();

    expect(
      friendshipApi.getFriends
    ).toHaveBeenCalledTimes(2);
  });

  // ==========================================
  // 8. DECLINE REQUEST
  // ==========================================

  test("declines an incoming friend request", async () => {
    const user = userEvent.setup();

    render(<FriendsPageApi />);

    await screen.findByText("User #3");

    await user.click(
      screen.getByRole("button", {
        name: "Decline",
      })
    );

    await waitFor(() => {
      expect(
        friendshipApi.declineRequest
      ).toHaveBeenCalledWith(11);
    });

    expect(
      await screen.findByText(
        "Friend request declined."
      )
    ).toBeInTheDocument();
  });

  // ==========================================
  // 9. CANCEL OUTGOING REQUEST
  // ==========================================

  test("cancels an outgoing request", async () => {
    const user = userEvent.setup();

    render(<FriendsPageApi />);

    await screen.findByText("User #4");

    await user.click(
      screen.getByRole("button", {
        name: "Cancel Request",
      })
    );

    await waitFor(() => {
      expect(
        friendshipApi.cancelRequest
      ).toHaveBeenCalledWith(12);
    });

    expect(
      await screen.findByText(
        "Friend request cancelled."
      )
    ).toBeInTheDocument();
  });

  // ==========================================
  // 10. REMOVE FRIEND
  // ==========================================

  test("removes an accepted friend", async () => {
    const user = userEvent.setup();

    render(<FriendsPageApi />);

    await waitForPage();

    await user.click(
      screen.getByRole("button", {
        name: "Remove Friend",
      })
    );

    await waitFor(() => {
      expect(
        friendshipApi.removeFriend
      ).toHaveBeenCalledWith(10);
    });

    expect(
      await screen.findByText("Friend removed.")
    ).toBeInTheDocument();
  });

  // ==========================================
  // 11. API FAILURE
  // ==========================================

  test("displays an error when friendship loading fails", async () => {
    friendshipApi.getFriends.mockRejectedValueOnce(
      new Error("Could not load friendships")
    );

    render(<FriendsPageApi />);

    expect(
      await screen.findByText(
        "Could not load friendships"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Try Again",
      })
    ).toBeInTheDocument();
  });

  // ==========================================
  // 12. RETRY FAILED REQUEST
  // ==========================================

  test("retries loading after an API failure", async () => {
    const user = userEvent.setup();

    friendshipApi.getFriends
      .mockRejectedValueOnce(
        new Error("Temporary server error")
      )
      .mockResolvedValue([acceptedFriendship]);

    render(<FriendsPageApi />);

    expect(
      await screen.findByText(
        "Temporary server error"
      )
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Try Again",
      })
    );

    await waitForPage();

    expect(
      friendshipApi.getFriends
    ).toHaveBeenCalledTimes(2);

    expect(
      screen.queryByText("Temporary server error")
    ).not.toBeInTheDocument();
  });
});
