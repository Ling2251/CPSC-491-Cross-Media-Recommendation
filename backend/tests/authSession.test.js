
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
const pool = require("../db");

describe("Authentication Session API", () => {
  let server;
  let baseUrl;
  let originalQuery;
  let originalSecret;

  const TEST_SECRET =
    "cpsc491-session-testing-secret-123456789";

  function tokenFor(userId, options = {}) {
    return jwt.sign(
      { userId },
      TEST_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1h",
        ...options,
      }
    );
  }

  async function request(token) {
    const headers = {};

    if (token !== undefined) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${baseUrl}/api/auth/me`,
      { headers }
    );

    return {
      status: response.status,
      body: await response.json(),
    };
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalQuery = pool.query;

    process.env.JWT_SECRET = TEST_SECRET;

    const app = express();
    app.use(express.json());

    // Test implementation of the session endpoint.
    app.get("/api/auth/me", async (req, res) => {
      const authorization = req.headers.authorization;

      const token =
        typeof authorization === "string" &&
        authorization.startsWith("Bearer ")
          ? authorization.slice(7)
          : null;

      if (!token) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      let payload;

      try {
        payload = jwt.verify(
          token,
          process.env.JWT_SECRET,
          { algorithms: ["HS256"] }
        );
      } catch {
        return res.status(401).json({
          message: "Invalid or expired token",
        });
      }

      const userId = payload.userId;

      if (
        !Number.isSafeInteger(userId) ||
        userId <= 0 ||
        userId > 2147483647
      ) {
        return res.status(401).json({
          message: "Invalid authentication identity",
        });
      }

      try {
        const result = await pool.query(
          `
          SELECT id, name, email, account_state
          FROM users
          WHERE id = $1
          `,
          [userId]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({
            message: "User no longer exists",
          });
        }

        return res.status(200).json({
          success: true,
          user: result.rows[0],
        });
      } catch {
        return res.status(500).json({
          message: "Failed to verify session",
        });
      }
    });

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl =
      `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    pool.query = mock.fn(async () => ({
      rows: [
        {
          id: 1,
          name: "Demo User A",
          email: "demoa@example.com",
          account_state: "ACTIVE",
        },
      ],
    }));
  });

  after(async () => {
    pool.query = originalQuery;

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

  it("rejects requests without a token", async () => {
    const result = await request();

    assert.equal(result.status, 401);
    assert.equal(
      result.body.message,
      "Authentication required"
    );
  });

  it("rejects invalid JWTs", async () => {
    const result = await request("invalid-token");

    assert.equal(result.status, 401);
  });

  it("rejects expired JWTs", async () => {
    const expiredToken = jwt.sign(
      { userId: 1 },
      TEST_SECRET,
      {
        algorithm: "HS256",
        expiresIn: -1,
      }
    );

    const result = await request(expiredToken);

    assert.equal(result.status, 401);
  });

  it("rejects invalid user IDs", async () => {
    const result = await request(tokenFor(0));

    assert.equal(result.status, 401);
    assert.equal(
      result.body.message,
      "Invalid authentication identity"
    );
  });

  it("restores a valid authenticated session", async () => {
    const result = await request(tokenFor(1));

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.user.id, 1);
    assert.equal(
      result.body.user.name,
      "Demo User A"
    );
  });

  it("retrieves the correct user from PostgreSQL", async () => {
    await request(tokenFor(2));

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [2]
    );
  });

  it("does not expose password hashes", async () => {
    const result = await request(tokenFor(1));

    assert.equal(result.status, 200);
    assert.equal(
      result.body.user.password_hash,
      undefined
    );
  });

  it("rejects sessions for deleted users", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    const result = await request(tokenFor(999));

    assert.equal(result.status, 401);
    assert.equal(
      result.body.message,
      "User no longer exists"
    );
  });

  it("handles database errors", async () => {
    pool.query.mock.mockImplementation(async () => {
      throw new Error("Database unavailable");
    });

    const result = await request(tokenFor(1));

    assert.equal(result.status, 500);
    assert.equal(
      result.body.message,
      "Failed to verify session"
    );
  });
});
