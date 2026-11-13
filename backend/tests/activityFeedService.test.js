
const {
  describe,
  it,
  beforeEach,
  afterEach,
  mock,
} = require("node:test");

const assert = require("node:assert/strict");
const pool = require("../db");

const {
  validateUserId,
  getFriendsActivityFeed,
} = require("../services/activityFeedService");

describe("Activity Feed Service", () => {
  let originalQuery;

  beforeEach(() => {
    originalQuery = pool.query;
    pool.query = mock.fn(async () => ({
      rows: [],
    }));
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  it("accepts a valid user ID", () => {
    assert.doesNotThrow(() => validateUserId(1));
  });

  it("rejects invalid user IDs", () => {
    for (const id of [0, -1, "1", null, 1.5, 2147483648]) {
      assert.throws(
        () => validateUserId(id),
        /Invalid user ID/
      );
    }
  });

  it("retrieves friend activities", async () => {
    const activities = [
      {
        id: 2,
        user_id: 2,
        user_name: "Demo User B",
        media_id: 1,
        media_title: "Activity Tracking Test Movie",
        activity_type: "rating",
      },
    ];

    pool.query.mock.mockImplementation(async () => ({
      rows: activities,
    }));

    const result = await getFriendsActivityFeed(1);

    assert.deepEqual(result, activities);
    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 20]
    );
  });

  it("filters activities to accepted friendships", async () => {
    await getFriendsActivityFeed(1);

    const sql = pool.query.mock.calls[0].arguments[0];

    assert.match(sql, /FROM friendships f/);
    assert.match(sql, /f\.status = 'accepted'/);
    assert.match(sql, /f\.requester_id/);
    assert.match(sql, /f\.receiver_id/);
  });

  it("enforces activity privacy", async () => {
    await getFriendsActivityFeed(1);

    const sql = pool.query.mock.calls[0].arguments[0];

    assert.match(sql, /u\.activity_public = TRUE/);
    assert.match(sql, /a\.user_id <> \$1/);
  });

  it("orders activities newest first", async () => {
    await getFriendsActivityFeed(1);

    const sql = pool.query.mock.calls[0].arguments[0];

    assert.match(
      sql,
      /ORDER BY a\.created_at DESC, a\.id DESC/
    );
  });

  it("returns an empty feed when no activity exists", async () => {
    const result = await getFriendsActivityFeed(1);

    assert.deepEqual(result, []);
  });

  it("supports a custom retrieval limit", async () => {
    await getFriendsActivityFeed(1, 10);

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 10]
    );
  });

  it("rejects invalid limits", async () => {
    for (const limit of [0, -1, 101, "20", 1.5]) {
      await assert.rejects(
        getFriendsActivityFeed(1, limit),
        /Limit must be between 1 and 100/
      );
    }

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("propagates database errors", async () => {
    pool.query.mock.mockImplementation(async () => {
      throw new Error("Database unavailable");
    });

    await assert.rejects(
      getFriendsActivityFeed(1),
      /Database unavailable/
    );
  });
});
