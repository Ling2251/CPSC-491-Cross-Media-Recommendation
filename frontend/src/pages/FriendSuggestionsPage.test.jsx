import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { friendshipApi } from "../services/friendshipApi";
import { friendRecommendationApi } from "../services/friendRecommendationApi";
import FriendSuggestionsPage from "./FriendSuggestionsPage";

vi.mock("../services/friendshipApi", () => ({
  friendshipApi: {
    getFriends: vi.fn(),
    getIncomingRequests: vi.fn(),
    getOutgoingRequests: vi.fn(),
    sendRequest: vi.fn(),
  },
}));

vi.mock("../services/friendRecommendationApi", () => ({
  friendRecommendationApi: {
    getRecommendations: vi.fn(),
  },
}));

const suggestions = [
  {
    user_id: 2,
    username: "Sarah777",
    similarity_score: 0.92,
    scores: { video: 0.9, audio: 0, text: 0.8 },
    media_types: ["movies", "books"],
    shared_tags: ["sci-fi"],
  },
  {
    user_id: 3,
    username: "LoFiLuna",
    similarity_score: 0.65,
    scores: { video: 0, audio: 0.7, text: 0.4 },
    media_types: ["music", "books"],
    shared_tags: ["jazz", "chill"],
  },
  {
    user_id: 4,
    username: "BookishBen",
    similarity_score: 0.58,
    scores: { video: 0, audio: 0, text: 0.6 },
    media_types: ["books"],
    shared_tags: ["fantasy", "sci-fi"],
  },
];

describe("FriendSuggestionsPage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "test-token");
    friendRecommendationApi.getRecommendations.mockResolvedValue({
      userId: 1,
      recommendations: suggestions,
    });
    friendshipApi.getFriends.mockResolvedValue([]);
    friendshipApi.getIncomingRequests.mockResolvedValue([
      {
        id: 1,
        requesterId: 2,
        receiverId: 1,
        status: "PENDING",
      },
    ]);
    friendshipApi.getOutgoingRequests.mockResolvedValue([]);
    friendshipApi.sendRequest.mockResolvedValue({
      message: "Friend request sent.",
    });
  });

  test("loads API recommendations and excludes users with pending requests", async () => {
    render(<FriendSuggestionsPage userId={1} />);

    expect(
      screen.getByRole("heading", { name: "Friend Suggestions" })
    ).toBeInTheDocument();
    expect(await screen.findByText("LoFiLuna")).toBeInTheDocument();
    expect(screen.getByText("BookishBen")).toBeInTheDocument();
    expect(screen.queryByText("Sarah777")).not.toBeInTheDocument();
    expect(friendRecommendationApi.getRecommendations).toHaveBeenCalledOnce();
    expect(friendshipApi.getFriends).toHaveBeenCalledOnce();
  });

  test("shows recommendation cards in descending similarity order", async () => {
    render(<FriendSuggestionsPage userId={1} />);

    const region = await screen.findByRole("region", {
      name: "Recommended users",
    });
    const recommendationNames = region.querySelectorAll(".fr-username");

    expect(
      Array.from(recommendationNames, (heading) => heading.textContent)
    ).toEqual(["LoFiLuna", "BookishBen"]);
  });

  test("filters recommendations by media category", async () => {
    render(<FriendSuggestionsPage userId={1} />);
    await screen.findByText("LoFiLuna");

    fireEvent.click(screen.getByRole("button", { name: "Music" }));

    expect(screen.getByText("LoFiLuna")).toBeInTheDocument();
    expect(screen.queryByText("BookishBen")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Music" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Movies" }));
    expect(screen.getByText("No suggestions found")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("BookishBen")).toBeInTheDocument();
  });

  test("sends a friend request through the friendship API", async () => {
    render(<FriendSuggestionsPage userId={1} />);
    const lunaName = await screen.findByText("LoFiLuna");
    const card = lunaName.closest("article");

    fireEvent.click(within(card).getByRole("button", { name: "Add Friend" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Friend request sent."
    );
    expect(friendshipApi.sendRequest).toHaveBeenCalledWith(3);
    expect(screen.queryByText("LoFiLuna")).not.toBeInTheDocument();
  });

  test("opens and closes a suggested user's profile", async () => {
    render(<FriendSuggestionsPage userId={1} />);

    const lunaCard = (await screen.findByText("LoFiLuna")).closest("article");
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

  test("refreshes recommendations from the API", async () => {
    render(<FriendSuggestionsPage userId={1} />);
    await screen.findByText("LoFiLuna");
    friendRecommendationApi.getRecommendations.mockResolvedValueOnce({
      userId: 1,
      recommendations: [],
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Recommendations" })
    );

    expect(await screen.findByText("No suggestions found")).toBeInTheDocument();
    expect(friendRecommendationApi.getRecommendations).toHaveBeenCalledTimes(2);
  });

  test("surfaces API errors instead of showing mock recommendations", async () => {
    friendRecommendationApi.getRecommendations.mockRejectedValueOnce(
      new Error("Recommendation service unavailable.")
    );

    render(<FriendSuggestionsPage userId={1} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Recommendation service unavailable."
    );
    expect(screen.queryByText("LoFiLuna")).not.toBeInTheDocument();
  });

  test("shows recommendations to guests without loading friendship data", async () => {
    localStorage.removeItem("token");
    render(<FriendSuggestionsPage />);

    expect(await screen.findByText("LoFiLuna")).toBeInTheDocument();
    expect(screen.getByText(/Guest preview as user #1/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "View Profile" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Add Friend" })
    ).not.toBeInTheDocument();
    expect(friendshipApi.getFriends).not.toHaveBeenCalled();
  });
});
