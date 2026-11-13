
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

const feedService = require("../services/activityFeedService");
const feedRoutes = require("../routes/activityFeedRoutes");

describe("Activity Feed API Routes", () => {
  let server;
  let baseUrl;
  let originalGetFeed;
  let originalSecret;

  const TEST_SECRET = "activity-feed-test-secret";

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

  function authenticatedGet(path, userId = 1) {
    return request(path, {
      headers: {
        Authorization: `Bearer ${tokenFor(userId)}`,
      },
    });
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalGetFeed = feedService.getFriendsActivityFeed;

    process.env.JWT_SECRET = TEST_SECRET;

    const app = express();
    app.use(express.json());
    app.use("/api/feed", feedRoutes);

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    feedService.getFriendsActivityFeed = mock.fn(
      async () => []
    );
  });

  after(async () => {
    feedService.getFriendsActivityFeed = originalGetFeed;

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
    const result = await request("/api/feed");

    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request("/api/feed", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWT user identities", async () => {
    const result = await authenticatedGet(
      "/api/feed",
      0
    );

    assert.equal(result.status, 401);
  });

  it("retrieves activities for the authenticated user", async () => {
    feedService.getFriendsActivityFeed = mock.fn(
      async () => [
        {
          id: 1,
          user_id: 2,
          user_name: "Demo User B",
          media_id: 1,
          media_title: "Activity Tracking Test Movie",
          activity_type: "rating",
        },
      ]
    );

    const result = await authenticatedGet("/api/feed", 1);

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.activities.length, 1);

    assert.deepEqual(
      feedService.getFriendsActivityFeed.mock.calls[0].arguments,
      [1, 20]
    );
  });

  it("returns an empty feed", async () => {
    const result = await authenticatedGet("/api/feed");

    assert.equal(result.status, 200);
    assert.deepEqual(result.body.activities, []);
  });

  it("supports a custom limit", async () => {
    const result = await authenticatedGet(
      "/api/feed?limit=10"
    );

    assert.equal(result.status, 200);

    assert.deepEqual(
      feedService.getFriendsActivityFeed.mock.calls[0].arguments,
      [1, 10]
    );
  });

  it("rejects invalid limits", async () => {
    for (const limit of ["0", "101", "abc", "-1"]) {
      const result = await authenticatedGet(
        `/api/feed?limit=${limit}`
      );

      assert.equal(result.status, 400);
    }
  });

  it("handles database errors", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      feedService.getFriendsActivityFeed = mock.fn(
        async () => {
          throw new Error("Database unavailable");
        }
      );

      const result = await authenticatedGet("/api/feed");

      assert.equal(result.status, 500);
      assert.equal(result.body.success, false);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
