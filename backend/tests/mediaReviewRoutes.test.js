
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

const reviewService = require("../services/mediaReviewService");
const reviewRoutes = require("../routes/mediaReviewRoutes");

describe("Media Review API Routes", () => {
  let server;
  let baseUrl;
  let originalCreate;
  let originalGet;
  let originalSecret;

  const TEST_SECRET = "review-route-test-secret";

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

  function authenticatedPost(body, userId = 5) {
    return request("/api/reviews", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor(userId)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalCreate = reviewService.createReview;
    originalGet = reviewService.getMediaReviews;

    process.env.JWT_SECRET = TEST_SECRET;

    const app = express();
    app.use(express.json());
    app.use("/api/reviews", reviewRoutes);

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    reviewService.createReview = mock.fn(
      async (userId, mediaId, content) => ({
        review: {
          id: 1,
          user_id: userId,
          media_id: mediaId,
          content,
        },
        activity: {
          id: 10,
          user_id: userId,
          media_id: mediaId,
          activity_type: "review",
        },
        createdActivity: true,
      })
    );

    reviewService.getMediaReviews = mock.fn(
      async () => []
    );
  });

  after(async () => {
    reviewService.createReview = originalCreate;
    reviewService.getMediaReviews = originalGet;

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

  it("rejects review creation without authentication", async () => {
    const result = await request("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaId: 1,
        content: "Great movie!",
      }),
    });

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request("/api/reviews", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaId: 1,
        content: "Great movie!",
      }),
    });

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWT user identities", async () => {
    const result = await authenticatedPost(
      { mediaId: 1, content: "Great movie!" },
      0
    );

    assert.equal(result.status, 401);
  });

  it("creates a review for the authenticated user", async () => {
    const result = await authenticatedPost({
      userId: 999,
      mediaId: 1,
      content: "Great movie!",
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.review.user_id, 5);
    assert.equal(
      result.body.activity.activity_type,
      "review"
    );

    assert.deepEqual(
      reviewService.createReview.mock.calls[0].arguments,
      [5, 1, "Great movie!"]
    );
  });

  it("rejects empty review content", async () => {
    const result = await authenticatedPost({
      mediaId: 1,
      content: "   ",
    });

    assert.equal(result.status, 400);
    assert.equal(
      reviewService.createReview.mock.calls.length,
      0
    );
  });

  it("rejects reviews over 2000 characters", async () => {
    const result = await authenticatedPost({
      mediaId: 1,
      content: "a".repeat(2001),
    });

    assert.equal(result.status, 400);
  });

  it("rejects invalid media IDs", async () => {
    const result = await authenticatedPost({
      mediaId: -1,
      content: "Great movie!",
    });

    assert.equal(result.status, 400);
  });

  it("retrieves reviews for a media item", async () => {
    reviewService.getMediaReviews = mock.fn(
      async () => [
        {
          id: 1,
          user_id: 5,
          media_id: 1,
          content: "Great movie!",
        },
      ]
    );

    const result = await request(
      "/api/reviews/media/1"
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.reviews.length, 1);

    assert.deepEqual(
      reviewService.getMediaReviews.mock.calls[0].arguments,
      [1]
    );
  });

  it("rejects invalid media IDs for retrieval", async () => {
    const result = await request(
      "/api/reviews/media/invalid"
    );

    assert.equal(result.status, 400);
  });

  it("handles nonexistent media IDs", async () => {
    reviewService.createReview = mock.fn(
      async () => {
        const error = new Error("Foreign key violation");
        error.code = "23503";
        throw error;
      }
    );

    const result = await authenticatedPost({
      mediaId: 999,
      content: "Great movie!",
    });

    assert.equal(result.status, 404);
  });
});
