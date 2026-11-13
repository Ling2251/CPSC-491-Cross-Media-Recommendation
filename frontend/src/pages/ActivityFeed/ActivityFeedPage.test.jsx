
import {
  beforeEach,
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

import ActivityFeedPage from "./ActivityFeedPage";

import {
  getFriendsActivityFeed,
} from "../../services/activityFeedApi";

import {
  getActivityPrivacy,
  updateActivityPrivacy,
} from "../../services/activityPrivacyApi";

// Mock Activity Feed API
vi.mock("../../services/activityFeedApi", () => ({
  getFriendsActivityFeed: vi.fn(),
}));

// Mock Activity Privacy API
vi.mock("../../services/activityPrivacyApi", () => ({
  getActivityPrivacy: vi.fn(),
  updateActivityPrivacy: vi.fn(),
}));

const mockActivities = [
  {
    id: 1,
    user_id: 2,
    user_name: "Demo User B",
    media_id: 1,
    media_title: "Activity Tracking Test Movie",
    media_type: "movie",
    activity_type: "rating",
    created_at: "2026-11-13T01:39:06.163Z",
  },
  {
    id: 2,
    user_id: 2,
    user_name: "Demo User B",
    media_id: 2,
    media_title: "Test TV Show",
    media_type: "tv",
    activity_type: "review",
    created_at: "2026-11-13T01:40:06.163Z",
  },
  {
    id: 3,
    user_id: 2,
    user_name: "Demo User B",
    media_id: 3,
    media_title: "Test Book",
    media_type: "book",
    activity_type: "watchlist_add",
    created_at: "2026-11-13T01:41:06.163Z",
  },
];

describe("ActivityFeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getFriendsActivityFeed.mockResolvedValue([]);

    getActivityPrivacy.mockResolvedValue({
      success: true,
      userId: 1,
      activityPublic: false,
    });

    updateActivityPrivacy.mockImplementation(
      async (activityPublic) => ({
        success: true,
        userId: 1,
        activityPublic,
      })
    );
  });

  // =====================================================
  // ACTIVITY FEED TESTS
  // =====================================================

  it("renders the Activity Feed heading", async () => {
    render(<ActivityFeedPage />);

    expect(
      screen.getByRole("heading", {
        name: /friends activity feed/i,
      })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(getFriendsActivityFeed)
        .toHaveBeenCalledTimes(1);
    });
  });

  it("loads activities when the page opens", async () => {
    getFriendsActivityFeed.mockResolvedValue(
      mockActivities
    );

    render(<ActivityFeedPage />);

    expect(
      await screen.findAllByText("Demo User B")
    ).toHaveLength(3);

    expect(getFriendsActivityFeed)
      .toHaveBeenCalledTimes(1);
  });

  it("displays rating activities", async () => {
    getFriendsActivityFeed.mockResolvedValue([
      mockActivities[0],
    ]);

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText(
        "Activity Tracking Test Movie"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("rated")
    ).toBeInTheDocument();
  });

  it("displays review activities", async () => {
    getFriendsActivityFeed.mockResolvedValue([
      mockActivities[1],
    ]);

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText("Test TV Show")
    ).toBeInTheDocument();

    expect(
      screen.getByText("reviewed")
    ).toBeInTheDocument();
  });

  it("displays watchlist additions", async () => {
    getFriendsActivityFeed.mockResolvedValue([
      mockActivities[2],
    ]);

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText("Test Book")
    ).toBeInTheDocument();

    expect(
      screen.getByText("added to their watchlist")
    ).toBeInTheDocument();
  });

  it("displays an empty state", async () => {
    render(<ActivityFeedPage />);

    expect(
      await screen.findByRole("heading", {
        name: /no activities yet/i,
      })
    ).toBeInTheDocument();
  });

  it("displays an error when the Feed API fails", async () => {
    getFriendsActivityFeed.mockRejectedValue(
      new Error(
        "Please log in to view your activity feed."
      )
    );

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText(
        "Please log in to view your activity feed."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /try again/i,
      })
    ).toBeInTheDocument();
  });

  it("refreshes activities", async () => {
    getFriendsActivityFeed
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockActivities[0]]);

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText(/no activities yet/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /refresh feed/i,
      })
    );

    expect(
      await screen.findByText(
        "Activity Tracking Test Movie"
      )
    ).toBeInTheDocument();

    expect(getFriendsActivityFeed)
      .toHaveBeenCalledTimes(2);
  });

  it("retries after a Feed API error", async () => {
    getFriendsActivityFeed
      .mockRejectedValueOnce(
        new Error("Network error")
      )
      .mockResolvedValueOnce([mockActivities[0]]);

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText("Network error")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /try again/i,
      })
    );

    expect(
      await screen.findByText(
        "Activity Tracking Test Movie"
      )
    ).toBeInTheDocument();

    expect(getFriendsActivityFeed)
      .toHaveBeenCalledTimes(2);
  });

  it("shows a loading state", async () => {
    let resolveRequest;

    getFriendsActivityFeed.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    render(<ActivityFeedPage />);

    expect(
      screen.getByText(
        "Loading your friends' activities..."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /loading/i,
      })
    ).toBeDisabled();

    resolveRequest([]);

    expect(
      await screen.findByText(/no activities yet/i)
    ).toBeInTheDocument();
  });

  it("displays media types", async () => {
    getFriendsActivityFeed.mockResolvedValue(
      mockActivities
    );

    render(<ActivityFeedPage />);

    expect(
      await screen.findByText("Test Book")
    ).toBeInTheDocument();

    expect(
      screen.getByText("movie")
    ).toBeInTheDocument();

    expect(
      screen.getByText("tv")
    ).toBeInTheDocument();

    expect(
      screen.getByText("book")
    ).toBeInTheDocument();
  });

  // =====================================================
  // ACTIVITY PRIVACY TESTS
  // =====================================================

  it("loads the user's privacy settings", async () => {
    render(<ActivityFeedPage />);

    await waitFor(() => {
      expect(getActivityPrivacy)
        .toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByLabelText(
        /share my activity with friends/i
      )
    ).toBeInTheDocument();
  });

  it("displays enabled activity sharing", async () => {
    getActivityPrivacy.mockResolvedValue({
      success: true,
      userId: 2,
      activityPublic: true,
    });

    render(<ActivityFeedPage />);

    const checkbox = await screen.findByLabelText(
      /share my activity with friends/i
    );

    expect(checkbox).toBeChecked();
  });

  it("enables activity sharing", async () => {
    render(<ActivityFeedPage />);

    const checkbox = await screen.findByLabelText(
      /share my activity with friends/i
    );

    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateActivityPrivacy)
        .toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    expect(
      screen.getByText(
        "Activity sharing updated successfully."
      )
    ).toBeInTheDocument();
  });

  it("disables activity sharing", async () => {
    getActivityPrivacy.mockResolvedValue({
      success: true,
      userId: 2,
      activityPublic: true,
    });

    render(<ActivityFeedPage />);

    const checkbox = await screen.findByLabelText(
      /share my activity with friends/i
    );

    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateActivityPrivacy)
        .toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("handles privacy update errors", async () => {
    updateActivityPrivacy.mockRejectedValue(
      new Error("Failed to update privacy settings.")
    );

    render(<ActivityFeedPage />);

    const checkbox = await screen.findByLabelText(
      /share my activity with friends/i
    );

    fireEvent.click(checkbox);

    expect(
      await screen.findByText(
        "Failed to update privacy settings."
      )
    ).toBeInTheDocument();

    expect(checkbox).not.toBeChecked();

    expect(
      screen.getByRole("button", {
        name: /retry privacy settings/i,
      })
    ).toBeInTheDocument();
  });
});
