
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
  getActivityPrivacy,
  updateActivityPrivacy,
} = require("../services/activityPrivacyService");

describe("Activity Privacy Service", () => {
  let originalQuery;

  beforeEach(() => {
    originalQuery = pool.query;
    pool.query = mock.fn();
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  it("accepts valid user IDs", () => {
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

  it("retrieves activity privacy settings", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 2, activity_public: true }],
    }));

    const result = await getActivityPrivacy(2);

    assert.deepEqual(result, {
      userId: 2,
      activityPublic: true,
    });

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [2]
    );
  });

  it("returns false for private activity", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, activity_public: false }],
    }));

    const result = await getActivityPrivacy(1);

    assert.equal(result.activityPublic, false);
  });

  it("updates activity sharing to public", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, activity_public: true }],
    }));

    const result = await updateActivityPrivacy(1, true);

    assert.equal(result.activityPublic, true);

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, true]
    );
  });

  it("updates activity sharing to private", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 2, activity_public: false }],
    }));

    const result = await updateActivityPrivacy(2, false);

    assert.equal(result.activityPublic, false);
  });

  it("rejects non-boolean privacy values", async () => {
    await assert.rejects(
      updateActivityPrivacy(1, "true"),
      /Activity privacy must be a boolean/
    );

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("returns an error when the user does not exist", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    await assert.rejects(
      getActivityPrivacy(999),
      /User not found/
    );

    await assert.rejects(
      updateActivityPrivacy(999, true),
      /User not found/
    );
  });

  it("propagates database errors", async () => {
    pool.query.mock.mockImplementation(async () => {
      throw new Error("Database unavailable");
    });

    await assert.rejects(
      getActivityPrivacy(1),
      /Database unavailable/
    );
  });
});
