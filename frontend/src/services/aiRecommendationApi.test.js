import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { aiRecommendationApi, userIdFromToken, AI_API_URL } from "./aiRecommendationApi";

function tokenFor(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe("aiRecommendationApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the userId claim from a token without verifying it", () => {
    expect(userIdFromToken(tokenFor({ userId: 7 }))).toBe(7);
  });

  it("returns null for missing or malformed tokens", () => {
    expect(userIdFromToken(null)).toBeNull();
    expect(userIdFromToken("not-a-token")).toBeNull();
    expect(userIdFromToken(tokenFor({ userId: "7" }))).toBeNull();
  });

  it("sends a bearer token when loading preferences", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { favorite_genres: ["Drama"] }));

    const result = await aiRecommendationApi.getPreferences(7, "abc.def.ghi");

    expect(result).toEqual({ favorite_genres: ["Drama"] });
    expect(fetch).toHaveBeenCalledWith(
      `${AI_API_URL}/preferences/7`,
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer abc.def.ghi" },
      })
    );
  });

  it("sends preferences as a JSON PUT request", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { favorite_genres: ["Comedy"] }));
    const preferences = { favorite_genres: ["Comedy"], preferred_languages: ["English"] };

    await aiRecommendationApi.savePreferences(7, preferences, "token");

    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe("PUT");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual(preferences);
  });

  it("returns a 404 status for missing preferences so the page can handle it", async () => {
    fetch.mockResolvedValue(jsonResponse(404, { detail: "No saved preferences for this user" }));

    await expect(aiRecommendationApi.getPreferences(7, "token")).rejects.toMatchObject({ status: 404 });
  });

  it("shows an ownership message on 403 without exposing server details", async () => {
    fetch.mockResolvedValue(jsonResponse(403, { detail: "internal detail" }));

    await expect(aiRecommendationApi.getRecommendations(7, "token")).rejects.toThrow(
      "You can only view your own recommendations."
    );
  });

  it("builds the recommendation URL with top_n", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { user_id: 7, recommendations: [] }));

    await aiRecommendationApi.getRecommendations(7, "token", 3);

    expect(fetch.mock.calls[0][0]).toBe(`${AI_API_URL}/recommend/7?top_n=3`);
  });
});
