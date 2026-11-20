const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const pool = require("../db");
const friendshipService = require("../services/friendshipService");

const databaseTestsEnabled =
  process.env.FRIEND_RECOMMENDATION_TEST_DATABASE === "1";

it(
  "persists only valid friend-request states and unique user pairs",
  { skip: !databaseTestsEnabled },
  async () => {
    const userIds = [];

    try {
      for (const suffix of ["sender", "recipient"]) {
        const result = await pool.query(
          `INSERT INTO users (name, email, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [
            `Friendship test ${suffix}`,
            `friendship-${suffix}-${randomUUID()}@example.test`,
            "test-password-hash",
          ]
        );
        userIds.push(result.rows[0].id);
      }

      const [senderId, recipientId] = userIds;

      await assert.rejects(
        friendshipService.sendRequest(senderId, senderId),
        /Cannot send a friend request to yourself/
      );

      await assert.rejects(
        pool.query(
          `INSERT INTO friendships (requester_id, receiver_id, status)
           VALUES ($1, $1, 'pending')`,
          [senderId]
        ),
        { code: "23514" }
      );

      const created = await friendshipService.sendRequest(
        senderId,
        recipientId
      );

      assert.equal(created.status, "pending");

      await assert.rejects(
        friendshipService.sendRequest(senderId, recipientId),
        /already exists/
      );

      const existingUsers = await pool.query(
        `SELECT ids.id::int AS id
         FROM generate_series(2147483647, 2147483640, -1) AS ids(id)
         WHERE NOT EXISTS (
           SELECT 1 FROM users WHERE users.id = ids.id
         )
         LIMIT 1`
      );
      assert.equal(existingUsers.rows.length, 1);
      const missingUserId = existingUsers.rows[0].id;

      await assert.rejects(
        friendshipService.sendRequest(missingUserId, recipientId),
        { code: "23503" }
      );

      await assert.rejects(
        friendshipService.sendRequest(senderId, missingUserId),
        { code: "23503" }
      );

      await assert.rejects(
        pool.query(
          "UPDATE friendships SET status = 'invalid' WHERE id = $1",
          [created.id]
        ),
        { code: "23514" }
      );

      const rows = await pool.query(
        `SELECT requester_id, receiver_id, status
         FROM friendships
         WHERE id = $1`,
        [created.id]
      );

      assert.deepEqual(rows.rows, [{
        requester_id: senderId,
        receiver_id: recipientId,
        status: "pending",
      }]);

      const pairCount = await pool.query(
        `SELECT count(*)::int AS count
         FROM friendships
         WHERE (requester_id = $1 AND receiver_id = $2)
            OR (requester_id = $2 AND receiver_id = $1)`,
        [senderId, recipientId]
      );

      assert.equal(pairCount.rows[0].count, 1);
    } finally {
      if (userIds.length > 0) {
        await pool.query(
          "DELETE FROM users WHERE id = ANY($1::int[])",
          [userIds]
        );
      }
      await pool.end();
    }
  }
);
