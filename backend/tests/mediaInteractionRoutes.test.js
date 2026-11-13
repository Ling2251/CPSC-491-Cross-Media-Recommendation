
const {
  describe,
  it,
  before,
  after,
  beforeEach,
  mock,
} = require("node:test");

const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const mediaInteractionService = require(
  "../services/mediaInteractionService"
);
const mediaInteractionRoutes = require(
  "../routes/mediaInteractionRoutes"
);

describe("Media Interaction API Routes", () => {
  let server;
  let baseUrl;
  let originalSave;
  let originalSecret;

  const TEST_SECRET = "media-interaction-test-secret";

  function tokenFor(userId) {
    return jwt.sign(
      { userId },
      TEST_SECRET,
      { algorithm: "HS256", expiresIn: "1h" }
    );
  }

  async function request(path, options = {}) {
    const response = await fetch(baseUrl + path, options);

    return {
      status: response.status,
      body: await response.json(),
    };
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalSave =
      mediaInteractionService.saveMediaInteraction;

    process.env.JWT_SECRET = TEST_SECRET;

    const app = express();
    app.use(express.json());
    app.use(
      "/api/media-interactions",
      mediaInteractionRoutes
    );

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl =
      `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    mediaInteractionService.saveMediaInteraction =
      mock.fn(async (
        userId,
        mediaId,
        interactionType,
        rating = null
      ) => ({
        interaction: {
          id: 1,
          user_id: userId,
          media_id: mediaId,
          interaction_type: interactionType,
          rating,
        },
        activity: {
          id: 10,
          user_id: userId,
          media_id: mediaId,
          activity_type:
            interactionType === "rated"
              ? "rating"
              : "watchlist_add",
        },
        createdActivity: true,
      }));
  });

  after(async () => {
    mediaInteractionService.saveMediaInteraction =
      originalSave;

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("rejects requests without authentication", async () => {
    const result = await request(
      "/api/media-interactions/rating",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId: 1,
          rating: 5,
        }),
      }
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request(
      "/api/media-interactions/watchlist",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId: 1 }),
      }
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWT user IDs", async () => {
    const result = await request(
      "/api/media-interactions/watchlist",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(0)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId: 1 }),
      }
    );

    assert.equal(result.status, 401);
  });

  it("records a rating for the authenticated user", async () => {
    const result = await request(
      "/api/media-interactions/rating",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 999,
          mediaId: 1,
          rating: 5,
        }),
      }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.activity.activity_type, "rating");
    assert.equal(result.body.interaction.user_id, 5);
  });

  it("records a watchlist addition", async () => {
    const result = await request(
      "/api/media-interactions/watchlist",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId: 1 }),
      }
    );

    assert.equal(result.status, 200);
    assert.equal(
      result.body.activity.activity_type,
      "watchlist_add"
    );
  });

  it("rejects invalid ratings", async () => {
    const result = await request(
      "/api/media-interactions/rating",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId: 1,
          rating: 6,
        }),
      }
    );

    assert.equal(result.status, 400);
  });

  it("rejects invalid media IDs", async () => {
    const result = await request(
      "/api/media-interactions/watchlist",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId: -1 }),
      }
    );

    assert.equal(result.status, 400);
  });

  it("handles database foreign key errors", async () => {
    mediaInteractionService.saveMediaInteraction =
      mock.fn(async () => {
        const error = new Error("Foreign key violation");
        error.code = "23503";
        throw error;
      });

    const result = await request(
      "/api/media-interactions/watchlist",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId: 999 }),
      }
    );

    assert.equal(result.status, 404);
  });
});
