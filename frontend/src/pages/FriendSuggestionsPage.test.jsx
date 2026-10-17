import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FriendshipStatus } from "../models/friendship";
import { friendshipService } from "../services/friendshipService";
import FriendSuggestionsPage from "./FriendSuggestionsPage";

describe("FriendSuggestionsPage", () => {
  beforeEach(() => {
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

  test("shows suggestions and excludes self and users with pending requests", () => {
    render(<FriendSuggestionsPage />);

    expect(
      screen.getByRole("heading", { name: "Friend Suggestions" })
    ).toBeInTheDocument();
    expect(screen.getByText("LoFiLuna")).toBeInTheDocument();
    expect(screen.getByText("BookishBen")).toBeInTheDocument();
    expect(screen.queryByText("Sarah777")).not.toBeInTheDocument();
    expect(screen.queryByText("CrazyDave777")).not.toBeInTheDocument();
  });

  test("filters recommendations by media category", () => {
    render(<FriendSuggestionsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Music" }));

    expect(screen.getByText("LoFiLuna")).toBeInTheDocument();
    expect(screen.queryByText("BookishBen")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Music" })
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Movies" }));
    expect(screen.getByText("No suggestions found")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("BookishBen")).toBeInTheDocument();
  });

  test("sends a friend request from a suggestion card", () => {
    render(<FriendSuggestionsPage />);
    const card = screen.getByText("LoFiLuna").closest("article");

    fireEvent.click(
      within(card).getByRole("button", { name: "Add Friend" })
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Friend request sent."
    );
    expect(screen.queryByText("LoFiLuna")).not.toBeInTheDocument();
    expect(
      friendshipService.getOutgoingRequests(1)
    ).toHaveLength(1);
  });

  test("opens and closes a suggested user's profile", () => {
    render(<FriendSuggestionsPage />);

    const lunaCard = screen
      .getByText("LoFiLuna")
      .closest("article");
    fireEvent.click(
      within(lunaCard).getByRole("button", { name: "View Profile" })
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "LoFiLuna" })
    ).toBeInTheDocument();
    expect(within(dialog).getByText("jazz")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close profile" })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("refresh control confirms recommendations were refreshed", () => {
    render(<FriendSuggestionsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Recommendations" })
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Recommendations refreshed."
    );
  });
});
