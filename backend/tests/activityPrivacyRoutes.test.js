
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

const privacyService = require("../services/activityPrivacyService");
const privacyRoutes = require("../routes/activityPrivacyRoutes");

describe("Activity Privacy API Routes", () => {
  let server;
  let baseUrl;
  let originalGet;
  let originalUpdate;
  let originalSecret;

  const TEST_SECRET = "privacy-route-test-secret";

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

  function authenticatedRequest(
    path,
    options = {},
    userId = 1
  ) {
    return request(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokenFor(userId)}`,
      },
    });
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalGet = privacyService.getActivityPrivacy;
    originalUpdate = privacyService.updateActivityPrivacy;

    process.env.JWT_SECRET = TEST_SECRET;

    const app = express();
    app.use(express.json());
    app.use("/api/privacy", privacyRoutes);

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    privacyService.getActivityPrivacy = mock.fn(
      async (userId) => ({
        userId,
        activityPublic: false,
      })
    );

    privacyService.updateActivityPrivacy = mock.fn(
      async (userId, activityPublic) => ({
        userId,
        activityPublic,
      })
    );
  });

  after(async () => {
    privacyService.getActivityPrivacy = originalGet;
    privacyService.updateActivityPrivacy = originalUpdate;

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
      "/api/privacy/activity"
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request(
      "/api/privacy/activity",
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      }
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWT identities", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {},
      0
    );

    assert.equal(result.status, 401);
  });

  it("retrieves the authenticated user's privacy", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {},
      2
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.userId, 2);

    assert.deepEqual(
      privacyService.getActivityPrivacy.mock.calls[0].arguments,
      [2]
    );
  });

  it("updates activity sharing to public", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityPublic: true,
        }),
      },
      2
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.activityPublic, true);

    assert.deepEqual(
      privacyService.updateActivityPrivacy.mock.calls[0].arguments,
      [2, true]
    );
  });

  it("updates activity sharing to private", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityPublic: false,
        }),
      }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.activityPublic, false);
  });

  it("rejects non-boolean privacy values", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityPublic: "true",
        }),
      }
    );

    assert.equal(result.status, 400);
    assert.equal(
      privacyService.updateActivityPrivacy.mock.calls.length,
      0
    );
  });

  it("ignores attempts to modify another user's privacy", async () => {
    const result = await authenticatedRequest(
      "/api/privacy/activity",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 999,
          activityPublic: true,
        }),
      },
      1
    );

    assert.equal(result.status, 200);

    assert.deepEqual(
      privacyService.updateActivityPrivacy.mock.calls[0].arguments,
      [1, true]
    );
  });

  it("handles nonexistent users", async () => {
    privacyService.getActivityPrivacy = mock.fn(
      async () => {
        throw new Error("User not found");
      }
    );

    const result = await authenticatedRequest(
      "/api/privacy/activity"
    );

    assert.equal(result.status, 404);
  });
});
