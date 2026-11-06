
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import { friendshipApi } from "./friendshipApi";

describe("Friendship API Client", () => {
  beforeEach(() => {
    localStorage.clear();

    localStorage.setItem(
      "token",
      "test-jwt-token"
    );

    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function mockResponse(data, status = 200) {
    fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    });
  }

  it("rejects requests when the user is not logged in", async () => {
    localStorage.removeItem("token");

    await expect(
      friendshipApi.getFriends()
    ).rejects.toThrow(
      "Please log in to manage friendships."
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("retrieves accepted friendships", async () => {
    const friendships = [
      {
        id: 1,
        requesterId: 1,
        receiverId: 2,
        status: "ACCEPTED",
      },
    ];

    mockResponse({ success: true, friendships });

    const result = await friendshipApi.getFriends();

    expect(result).toEqual(friendships);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );
  });

  it("retrieves incoming friend requests", async () => {
    const friendships = [
      {
        id: 2,
        requesterId: 2,
        receiverId: 1,
        status: "PENDING",
      },
    ];

    mockResponse({ success: true, friendships });

    const result =
      await friendshipApi.getIncomingRequests();

    expect(result).toEqual(friendships);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests/incoming",
      expect.any(Object)
    );
  });

  it("retrieves outgoing friend requests", async () => {
    mockResponse({
      success: true,
      friendships: [],
    });

    const result =
      await friendshipApi.getOutgoingRequests();

    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests/outgoing",
      expect.any(Object)
    );
  });

  it("sends a friend request", async () => {
    mockResponse(
      {
        success: true,
        message: "Friend request sent",
      },
      201
    );

    const result = await friendshipApi.sendRequest(2);

    expect(result.success).toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ receiverId: 2 }),
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );
  });

  it("accepts a pending request", async () => {
    mockResponse({
      success: true,
      message: "Friend request accepted",
    });

    const result =
      await friendshipApi.acceptRequest(10);

    expect(result.success).toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests/10/accept",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("declines a pending request", async () => {
    mockResponse({
      success: true,
      message: "Friend request declined",
    });

    await friendshipApi.declineRequest(10);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests/10/decline",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("cancels an outgoing request", async () => {
    mockResponse({
      success: true,
      message: "Friend request cancelled",
    });

    await friendshipApi.cancelRequest(10);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/requests/10",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("removes an accepted friend", async () => {
    mockResponse({
      success: true,
      message: "Friend removed successfully",
    });

    await friendshipApi.removeFriend(10);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/friends/10",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("handles expired authentication tokens", async () => {
    mockResponse(
      {
        success: false,
        message: "Invalid or expired token",
      },
      401
    );

    await expect(
      friendshipApi.getFriends()
    ).rejects.toThrow(
      "Your session is invalid or has expired."
    );
  });

  it("handles backend validation errors", async () => {
    mockResponse(
      {
        success: false,
        message: "A friendship already exists",
      },
      409
    );

    await expect(
      friendshipApi.sendRequest(2)
    ).rejects.toThrow(
      "A friendship already exists"
    );
  });

  it("handles network failures", async () => {
    fetch.mockRejectedValueOnce(
      new Error("Failed to fetch")
    );

    await expect(
      friendshipApi.getFriends()
    ).rejects.toThrow("Failed to fetch");
  });

  it("handles server errors", async () => {
    mockResponse(
      {
        success: false,
        message: "Friendship operation failed",
      },
      500
    );

    await expect(
      friendshipApi.getFriends()
    ).rejects.toThrow(
      "Friendship operation failed"
    );
  });
});
