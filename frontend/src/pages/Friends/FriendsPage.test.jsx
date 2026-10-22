
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FriendsPage from "./FriendsPage";
import { friendshipService } from "../../services/friendshipService";
import { FriendshipStatus } from "../../models/friendship";

// Isolate FriendsPage from its child component.
vi.mock("../../components/friends/FriendRequestCard", () => ({
  default: ({ request, onAccept, onDecline }) => (
    <article data-testid={`request-${request.id}`}>
      <p>Request from User {request.requesterId}</p>

      <button
        type="button"
        onClick={() => onAccept(request.id)}
      >
        Accept
      </button>

      <button
        type="button"
        onClick={() => onDecline(request.id)}
      >
        Decline
      </button>
    </article>
  ),
}));

// Isolate the page from privacy service behavior.
vi.mock("../../services/privacyService", () => ({
  getUserById: (id) => ({
    id,
    username: `User${id}`,
    bio: `Bio for User ${id}`,
  }),
  canViewUserActivity: () => true,
}));

describe("FriendsPage - React Component Tests", () => {
  beforeEach(() => {
    // Reset the singleton service before each test.
    friendshipService.friendships = [
      {
        id: 1,
        requesterId: 2,
        receiverId: 1,
        status: FriendshipStatus.PENDING,
      },
    ];

    friendshipService.nextId = 2;
  });

  test("renders the Friends page", () => {
    render(<FriendsPage />);

    expect(
      screen.getByRole("heading", {
        name: "Friends",
        level: 1,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Manage your friends and friend requests."
      )
    ).toBeInTheDocument();
  });

  test("displays incoming friend requests", () => {
    render(<FriendsPage />);

    expect(
      screen.getByText("Request from User 2")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Accept" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Decline" })
    ).toBeInTheDocument();
  });

  test("accepts a friend request", async () => {
    const user = userEvent.setup();

    render(<FriendsPage />);

    await user.click(
      screen.getByRole("button", { name: "Accept" })
    );

    expect(
      screen.getByText("Friend request accepted.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("User2")
    ).toBeInTheDocument();

    expect(
      friendshipService.getFriends(1)
    ).toHaveLength(1);

    expect(
      screen.queryByText("Request from User 2")
    ).not.toBeInTheDocument();
  });

  test("declines a friend request", async () => {
    const user = userEvent.setup();

    render(<FriendsPage />);

    await user.click(
      screen.getByRole("button", { name: "Decline" })
    );

    expect(
      screen.getByText("Friend request declined.")
    ).toBeInTheDocument();

    expect(
      friendshipService.getIncomingRequests(1)
    ).toHaveLength(0);

    expect(
      screen.getByText("No pending requests")
    ).toBeInTheDocument();
  });

  test("removes an accepted friend", async () => {
    const user = userEvent.setup();

    // Prepare an accepted friendship.
    friendshipService.acceptRequest(1, 1);

    render(<FriendsPage />);

    expect(
      screen.getByText("User2")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Remove Friend",
      })
    );

    expect(
      screen.getByText("Friend removed.")
    ).toBeInTheDocument();

    expect(
      friendshipService.getFriends(1)
    ).toHaveLength(0);

    expect(
      screen.getByText("No friends yet")
    ).toBeInTheDocument();
  });

  test("displays outgoing requests", () => {
    // User 1 sends a pending request to User 3.
    const result = friendshipService.sendRequest(1, 3);

    expect(result.success).toBe(true);

    render(<FriendsPage />);

    const sentSection = screen
      .getByRole("heading", { name: "Sent Requests" })
      .closest("section");

    expect(
      within(sentSection).getByText("User3")
    ).toBeInTheDocument();

    expect(
      within(sentSection).getByText("Request Pending")
    ).toBeInTheDocument();

    expect(
      within(sentSection).getByRole("button", {
        name: "Cancel Request",
      })
    ).toBeInTheDocument();
  });

  test("cancels an outgoing friend request", async () => {
    const user = userEvent.setup();

    friendshipService.sendRequest(1, 3);

    render(<FriendsPage />);

    await user.click(
      screen.getByRole("button", {
        name: "Cancel Request",
      })
    );

    expect(
      screen.getByText("Friend request cancelled.")
    ).toBeInTheDocument();

    expect(
      friendshipService.getOutgoingRequests(1)
    ).toHaveLength(0);

    expect(
      screen.getByText(
        "You have no pending outgoing requests."
      )
    ).toBeInTheDocument();
  });

  test("displays empty states with no friendships", () => {
    friendshipService.friendships = [];

    render(<FriendsPage />);

    expect(
      screen.getByText("No pending requests")
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

  test("does not show removal actions for pending requests", () => {
    render(<FriendsPage />);

    expect(
      screen.queryByRole("button", {
        name: "Remove Friend",
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Cancel Request",
      })
    ).not.toBeInTheDocument();
  });

  test("displays privacy activity indicator for a friend", () => {
    friendshipService.acceptRequest(1, 1);

    render(<FriendsPage />);

    expect(
      screen.getByText("Public Activity")
    ).toBeInTheDocument();
  });
});
