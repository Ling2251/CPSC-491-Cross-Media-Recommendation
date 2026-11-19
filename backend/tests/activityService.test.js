
const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../db");

const {
  VALID_ACTIVITY_TYPES,
  validateActivity,
  recordActivity,
  getUserActivities,
} = require("../services/activityService");

describe("PostgreSQL Activity Service", () => {
  let originalQuery;

  beforeEach(() => {
    originalQuery = pool.query;
    pool.query = mock.fn();
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  it("supports the three required activity types", () => {
    assert.deepEqual(VALID_ACTIVITY_TYPES, [
      "rating",
      "review",
      "watchlist_add",
    ]);
  });

  it("accepts valid activity data", () => {
    assert.doesNotThrow(() => {
      validateActivity(1, 5, "rating");
    });
  });

  it("rejects invalid user IDs", () => {
    assert.throws(
      () => validateActivity(0, 5, "rating"),
      /Invalid user ID/
    );

    assert.throws(
      () => validateActivity("1", 5, "rating"),
      /Invalid user ID/
    );
  });

  it("rejects invalid media IDs", () => {
    assert.throws(
      () => validateActivity(1, -1, "rating"),
      /Invalid media ID/
    );

    assert.throws(
      () => validateActivity(1, "5", "rating"),
      /Invalid media ID/
    );
  });

  it("rejects unsupported activity types", () => {
    assert.throws(
      () => validateActivity(1, 5, "message"),
      /Invalid activity type/
    );
  });

  it("records a rating activity", async () => {
    const activity = {
      id: 10,
      user_id: 1,
      media_id: 5,
      activity_type: "rating",
      created_at: new Date(),
    };

    pool.query.mock.mockImplementation(async () => ({
      rows: [activity],
    }));

    const result = await recordActivity(1, 5, "rating");

    assert.deepEqual(result, activity);
    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /INSERT INTO activities/
    );
    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 5, "rating"]
    );
  });

  it("records a review activity", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 11, activity_type: "review" }],
    }));

    const result = await recordActivity(1, 5, "review");

    assert.equal(result.activity_type, "review");
  });

  it("records a watchlist addition", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 12, activity_type: "watchlist_add" }],
    }));

    const result = await recordActivity(
      1,
      5,
      "watchlist_add"
    );

    assert.equal(result.activity_type, "watchlist_add");
  });

  it("does not query the database for invalid input", async () => {
    await assert.rejects(
      recordActivity(0, 5, "rating"),
      /Invalid user ID/
    );

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("retrieves activities in chronological order", async () => {
    const activities = [
      { id: 2, activity_type: "review" },
      { id: 1, activity_type: "rating" },
    ];

    pool.query.mock.mockImplementation(async () => ({
      rows: activities,
    }));

    const result = await getUserActivities(1);

    assert.deepEqual(result, activities);
    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /ORDER BY created_at DESC, id DESC/
    );
    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 20]
    );
  });

  it("returns an empty list when no activities exist", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    const result = await getUserActivities(1);

    assert.deepEqual(result, []);
  });

  it("rejects invalid retrieval limits", async () => {
    await assert.rejects(
      getUserActivities(1, 0),
      /Limit must be between 1 and 100/
    );

    await assert.rejects(
      getUserActivities(1, 101),
      /Limit must be between 1 and 100/
    );

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("propagates database errors", async () => {
    pool.query.mock.mockImplementation(async () => {
      throw new Error("Database unavailable");
    });

    await assert.rejects(
      recordActivity(1, 5, "rating"),
      /Database unavailable/
    );
  });
});
