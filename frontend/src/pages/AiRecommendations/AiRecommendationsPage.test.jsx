import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AiRecommendationsPage from "./AiRecommendationsPage";
import { AI_API_URL } from "../../services/aiRecommendationApi";

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

const SAVED = {
  favorite_genres: ["Drama"],
  preferred_languages: ["English"],
  content_types: ["movie", "tv_series"],
  rating_threshold: 5,
  discovery_interest: true,
};

const RECOMMENDATIONS = {
  user_id: 7,
  recommendations: [
    { media_id: 1, title: "Dark Drama", score: 2, reason: "matches your genres (Drama)" },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AiRecommendationsPage />
    </MemoryRouter>
  );
}

describe("AiRecommendationsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the user to log in when no token is stored", () => {
    renderPage();

    expect(screen.getByText(/log in to see recommendations/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads saved preferences and shows recommendations for the logged-in user", async () => {
    localStorage.setItem("token", tokenFor({ userId: 7 }));
    fetch.mockImplementation((url) => {
      if (url === `${AI_API_URL}/preferences/7`) return Promise.resolve(jsonResponse(200, SAVED));
      if (url === `${AI_API_URL}/recommend/7?top_n=5`) return Promise.resolve(jsonResponse(200, RECOMMENDATIONS));
      return Promise.reject(new Error(`unexpected request ${url}`));
    });

    renderPage();

    const results = await screen.findByRole("list");
    expect(within(results).getByText("Dark Drama")).toBeInTheDocument();
    expect(within(results).getByText("matches your genres (Drama)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Drama" })).toBeChecked();
  });

  it("prompts for preferences when none are saved yet", async () => {
    localStorage.setItem("token", tokenFor({ userId: 7 }));
    fetch.mockResolvedValue(jsonResponse(404, { detail: "No saved preferences for this user" }));

    renderPage();

    expect(await screen.findByText(/save your preferences to see recommendations/i)).toBeInTheDocument();
  });

  it("does not save when no genre is selected", async () => {
    localStorage.setItem("token", tokenFor({ userId: 7 }));
    fetch.mockResolvedValue(jsonResponse(404, {}));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: /save preferences/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Choose at least one genre.");
    const putCalls = fetch.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(putCalls).toHaveLength(0);
  });

  it("saves selected preferences and refreshes recommendations", async () => {
    localStorage.setItem("token", tokenFor({ userId: 7 }));
    fetch.mockImplementation((url, options) => {
      if (url === `${AI_API_URL}/preferences/7` && options?.method === "PUT") {
        return Promise.resolve(jsonResponse(200, SAVED));
      }
      if (url === `${AI_API_URL}/preferences/7`) return Promise.resolve(jsonResponse(404, {}));
      if (url === `${AI_API_URL}/recommend/7?top_n=5`) return Promise.resolve(jsonResponse(200, RECOMMENDATIONS));
      return Promise.reject(new Error(`unexpected request ${url}`));
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("checkbox", { name: "Drama" }));
    await user.click(screen.getByRole("checkbox", { name: "English" }));
    await user.click(screen.getByRole("button", { name: /save preferences/i }));

    expect(await screen.findByText("Dark Drama")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preferences saved.");

    const putCall = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
    expect(JSON.parse(putCall[1].body)).toMatchObject({
      favorite_genres: ["Drama"],
      preferred_languages: ["English"],
    });
  });

  it("shows a clear message when the server refuses access", async () => {
    localStorage.setItem("token", tokenFor({ userId: 7 }));
    fetch.mockImplementation((url) => {
      if (url.endsWith("/preferences/7")) return Promise.resolve(jsonResponse(200, SAVED));
      return Promise.resolve(jsonResponse(403, { detail: "Not authorized" }));
    });

    renderPage();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "You can only view your own recommendations."
    );
    await waitFor(() => expect(screen.queryByText("Dark Drama")).not.toBeInTheDocument());
  });
});
