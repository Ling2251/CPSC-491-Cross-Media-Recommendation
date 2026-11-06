
const { describe, it, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");

const express = require("express");
const jwt = require("jsonwebtoken");

const activityService = require("../services/activityService");
const activityRoutes = require("../routes/activityRoutes");

describe("Activity API Routes", () => {
  let server;
  let baseUrl;
  let originalGet;
  let originalRecord;
  let originalSecret;
  let originalNodeEnv;

  const TEST_SECRET = "activity-route-test-secret";

  function tokenFor(userId) {
    return jwt.sign({ userId }, TEST_SECRET, {
      algorithm: "HS256",
      expiresIn: "1h",
    });
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
    originalNodeEnv = process.env.NODE_ENV;

    process.env.JWT_SECRET = TEST_SECRET;
    process.env.NODE_ENV = "development";

    originalGet = activityService.getUserActivities;
    originalRecord = activityService.recordActivity;

    const app = express();
    app.use(express.json());
    app.use("/api/activities", activityRoutes);

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    activityService.getUserActivities = originalGet;
    activityService.recordActivity = originalRecord;

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("rejects requests without a token", async () => {
    const result = await request("/api/activities/me");

    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request("/api/activities/me", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    assert.equal(result.status, 401);
  });

  it("rejects invalid user identities", async () => {
    const result = await request("/api/activities/me", {
      headers: {
        Authorization: `Bearer ${tokenFor(0)}`,
      },
    });

    assert.equal(result.status, 401);
  });

  it("retrieves the authenticated user's activities", async () => {
    activityService.getUserActivities = mock.fn(
      async () => [
        {
          id: 1,
          user_id: 5,
          media_id: 10,
          activity_type: "rating",
        },
      ]
    );

    const result = await request("/api/activities/me", {
      headers: {
        Authorization: `Bearer ${tokenFor(5)}`,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.activities.length, 1);

    assert.deepEqual(
      activityService.getUserActivities.mock.calls[0].arguments,
      [5, 20]
    );
  });

  it("rejects invalid activity retrieval limits", async () => {
    const result = await request("/api/activities/me?limit=101", {
      headers: {
        Authorization: `Bearer ${tokenFor(5)}`,
      },
    });

    assert.equal(result.status, 400);
  });

  it("records an activity using the JWT user ID", async () => {
    activityService.recordActivity = mock.fn(
      async (userId, mediaId, activityType) => ({
        id: 2,
        user_id: userId,
        media_id: mediaId,
        activity_type: activityType,
      })
    );

    const result = await request("/api/activities", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor(5)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 999,
        mediaId: 10,
        activityType: "review",
      }),
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.activity.user_id, 5);

    assert.deepEqual(
      activityService.recordActivity.mock.calls[0].arguments,
      [5, 10, "review"]
    );
  });

  it("rejects invalid media IDs", async () => {
    const result = await request("/api/activities", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor(5)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaId: -1,
        activityType: "rating",
      }),
    });

    assert.equal(result.status, 400);
  });

  it("rejects unsupported activity types", async () => {
    const result = await request("/api/activities", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor(5)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaId: 10,
        activityType: "message",
      }),
    });

    assert.equal(result.status, 400);
  });

  it("disables manual activity creation outside development", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const result = await request("/api/activities", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenFor(5)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId: 10,
          activityType: "rating",
        }),
      });

      assert.equal(result.status, 404);
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
  });
});
