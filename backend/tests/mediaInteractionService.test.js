
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
  saveMediaInteraction,
} = require("../services/mediaInteractionService");

describe("Media Interaction Service", () => {
  let originalConnect;
  let client;
  let queries;

  beforeEach(() => {
    originalConnect = pool.connect;
    queries = [];

    client = {
      query: mock.fn(async (sql, params) => {
        const statement = sql.trim();
        queries.push({ statement, params });

        if (statement === "BEGIN" ||
            statement === "COMMIT" ||
            statement === "ROLLBACK") {
          return { rows: [] };
        }

        if (statement.includes("INSERT INTO user_media_interactions")) {
          return {
            rows: [{
              id: 1,
              user_id: params[0],
              media_id: params[1],
              interaction_type: statement.includes("'rated'")
                ? "rated"
                : "saved",
              rating: statement.includes("'rated'")
                ? params[2]
                : null,
            }],
          };
        }

        if (statement.includes("INSERT INTO activities")) {
          return {
            rows: [{
              id: 10,
              user_id: params[0],
              media_id: params[1],
              activity_type: params[2],
            }],
          };
        }

        return { rows: [] };
      }),

      release: mock.fn(),
    };

    pool.connect = mock.fn(async () => client);
  });

  afterEach(() => {
    pool.connect = originalConnect;
  });

  it("records a rating and creates an activity", async () => {
    const result = await saveMediaInteraction(
      1, 5, "rated", 5
    );

    assert.equal(result.interaction.rating, 5);
    assert.equal(result.activity.activity_type, "rating");
    assert.equal(result.createdActivity, true);

    assert.equal(queries[0].statement, "BEGIN");
    assert.equal(queries.at(-1).statement, "COMMIT");
    assert.equal(client.release.mock.calls.length, 1);
  });

  it("records a watchlist addition", async () => {
    const result = await saveMediaInteraction(
      1, 5, "saved"
    );

    assert.equal(result.interaction.interaction_type, "saved");
    assert.equal(
      result.activity.activity_type,
      "watchlist_add"
    );
  });

  it("rejects invalid ratings", async () => {
    await assert.rejects(
      saveMediaInteraction(1, 5, "rated", 0),
      /Rating must be between 1 and 5/
    );

    await assert.rejects(
      saveMediaInteraction(1, 5, "rated", 6),
      /Rating must be between 1 and 5/
    );

    assert.equal(pool.connect.mock.calls.length, 0);
  });

  it("rejects invalid IDs", async () => {
    await assert.rejects(
      saveMediaInteraction(0, 5, "saved"),
      /Invalid user ID/
    );

    await assert.rejects(
      saveMediaInteraction(1, -1, "saved"),
      /Invalid media ID/
    );

    assert.equal(pool.connect.mock.calls.length, 0);
  });

  it("rejects unsupported interaction types", async () => {
    await assert.rejects(
      saveMediaInteraction(1, 5, "reviewed"),
      /Invalid interaction type/
    );
  });

  it("rejects ratings on saved interactions", async () => {
    await assert.rejects(
      saveMediaInteraction(1, 5, "saved", 4),
      /Saved interactions cannot have ratings/
    );
  });

  it("does not create duplicate activities", async () => {
    client.query = mock.fn(async (sql) => {
      const statement = sql.trim();

      if (statement.includes("INSERT INTO user_media_interactions")) {
        return { rows: [] };
      }

      if (statement.includes("SELECT *")) {
        return {
          rows: [{
            id: 1,
            user_id: 1,
            media_id: 5,
            interaction_type: "saved",
            rating: null,
          }],
        };
      }

      return { rows: [] };
    });

    const result = await saveMediaInteraction(
      1, 5, "saved"
    );

    assert.equal(result.createdActivity, false);
    assert.equal(result.activity, null);

    const activityInserts = client.query.mock.calls.filter(
      (call) =>
        call.arguments[0].includes("INSERT INTO activities")
    );

    assert.equal(activityInserts.length, 0);
  });

  it("rolls back when activity creation fails", async () => {
    client.query = mock.fn(async (sql) => {
      const statement = sql.trim();

      if (statement.includes("INSERT INTO user_media_interactions")) {
        return { rows: [{ id: 1 }] };
      }

      if (statement.includes("INSERT INTO activities")) {
        throw new Error("Activity insert failed");
      }

      return { rows: [] };
    });

    await assert.rejects(
      saveMediaInteraction(1, 5, "saved"),
      /Activity insert failed/
    );

    const statements = client.query.mock.calls.map(
      (call) => call.arguments[0].trim()
    );

    assert.ok(statements.includes("ROLLBACK"));
    assert.ok(!statements.includes("COMMIT"));
    assert.equal(client.release.mock.calls.length, 1);
  });
});
