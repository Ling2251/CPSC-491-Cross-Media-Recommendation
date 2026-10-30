import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { friendRecommendationApi } from "./friendRecommendationApi";

describe("Friend recommendation API client", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "test-token");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("recalculates recommendations for the authenticated user", async () => {
    const recommendations = [{ user_id: 3, username: "LoFiLuna" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user_id: 7, recommendations }),
    });

    await expect(
      friendRecommendationApi.getRecommendations()
    ).resolves.toEqual({ userId: 7, recommendations });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/friend-recommendations/recalculate",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      })
    );
  });

  it("requests the built-in demo recommendations without login", async () => {
    localStorage.removeItem("token");
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user_id: 1, recommendations: [] }),
    });

    await expect(
      friendRecommendationApi.getRecommendations()
    ).resolves.toEqual({ userId: 1, recommendations: [] });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/friend-recommendations/demo",
      expect.objectContaining({ method: "GET", headers: {} })
    );
  });

  it("reports backend errors", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ detail: "Database unavailable." }),
    });

    await expect(
      friendRecommendationApi.getRecommendations()
    ).rejects.toThrow("Database unavailable.");
  });
});
