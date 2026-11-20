
const {
  describe,
  it,
  beforeEach,
  afterEach,
  mock,
} = require("node:test");

const assert = require("node:assert/strict");
const pool = require("../db");

const reviewService = require("../services/mediaReviewService");

describe("Media Review Service", () => {
  let originalConnect;
  let originalQuery;
  let client;

  beforeEach(() => {
    originalConnect = pool.connect;
    originalQuery = pool.query;

    client = {
      query: mock.fn(async (sql, params) => {
        const statement = sql.trim();

        if (statement.includes("INSERT INTO media_reviews")) {
          return {
            rows: [{
              id: 1,
              user_id: params[0],
              media_id: params[1],
              content: params[2],
            }],
          };
        }

        if (statement.includes("INSERT INTO activities")) {
          return {
            rows: [{
              id: 10,
              user_id: params[0],
              media_id: params[1],
              activity_type: "review",
            }],
          };
        }

        return { rows: [] };
      }),
      release: mock.fn(),
    };

    pool.connect = mock.fn(async () => client);
    pool.query = mock.fn(async () => ({ rows: [] }));
  });

  afterEach(() => {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  });

  it("validates review content", () => {
    assert.equal(
      reviewService.validateReview(" Great movie! "),
      "Great movie!"
    );
  });

  it("rejects empty reviews", () => {
    assert.throws(
      () => reviewService.validateReview("   "),
      /Review must contain/
    );
  });

  it("rejects reviews over 2000 characters", () => {
    assert.throws(
      () => reviewService.validateReview("a".repeat(2001)),
      /Review must contain/
    );
  });

  it("creates a review and activity", async () => {
    const result = await reviewService.createReview(
      1, 5, "Great movie!"
    );

    assert.equal(result.review.content, "Great movie!");
    assert.equal(result.activity.activity_type, "review");
    assert.equal(result.createdActivity, true);

    const statements = client.query.mock.calls.map(
      (call) => call.arguments[0].trim()
    );

    assert.equal(statements[0], "BEGIN");
    assert.equal(statements.at(-1), "COMMIT");
    assert.equal(client.release.mock.calls.length, 1);
  });

  it("rejects invalid IDs before connecting", async () => {
    await assert.rejects(
      reviewService.createReview(0, 5, "Great movie!"),
      /Invalid user ID/
    );

    await assert.rejects(
      reviewService.createReview(1, -1, "Great movie!"),
      /Invalid media ID/
    );

    assert.equal(pool.connect.mock.calls.length, 0);
  });

  it("rolls back when activity creation fails", async () => {
    client.query = mock.fn(async (sql) => {
      if (sql.includes("INSERT INTO media_reviews")) {
        return { rows: [{ id: 1 }] };
      }

      if (sql.includes("INSERT INTO activities")) {
        throw new Error("Activity insert failed");
      }

      return { rows: [] };
    });

    await assert.rejects(
      reviewService.createReview(1, 5, "Great movie!"),
      /Activity insert failed/
    );

    const statements = client.query.mock.calls.map(
      (call) => call.arguments[0].trim()
    );

    assert.ok(statements.includes("ROLLBACK"));
    assert.ok(!statements.includes("COMMIT"));
    assert.equal(client.release.mock.calls.length, 1);
  });

  it("retrieves reviews for a media item", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, content: "Great movie!" }],
    }));

    const reviews = await reviewService.getMediaReviews(5);

    assert.equal(reviews.length, 1);
    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [5, 20]
    );
  });

  it("retrieves reviews by user", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, user_id: 2 }],
    }));

    const reviews = await reviewService.getUserReviews(2);

    assert.equal(reviews[0].user_id, 2);
  });

  it("rejects invalid retrieval limits", async () => {
    await assert.rejects(
      reviewService.getMediaReviews(5, 101),
      /Limit must be between 1 and 100/
    );
  });
});
