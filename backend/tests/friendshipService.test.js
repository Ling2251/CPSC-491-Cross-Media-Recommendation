
const { describe, it, beforeEach, afterEach, mock } =
  require("node:test");

const assert = require("node:assert/strict");

const pool = require("../db");
const friendshipService = require("../services/friendshipService");

describe("PostgreSQL Friendship Service", () => {
  let originalQuery;

  beforeEach(() => {
    originalQuery = pool.query;
    pool.query = mock.fn();
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  it("gets accepted friends", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, status: "accepted" }],
    }));

    const result = await friendshipService.getFriends(1);

    assert.equal(result.length, 1);
    assert.equal(result[0].status, "accepted");
    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /status = 'accepted'/
    );
  });

  it("gets incoming friend requests", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 2, status: "pending" }],
    }));

    const result =
      await friendshipService.getIncomingRequests(1);

    assert.equal(result.length, 1);
    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1]
    );
  });

  it("gets outgoing friend requests", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 3, status: "pending" }],
    }));

    const result =
      await friendshipService.getOutgoingRequests(1);

    assert.equal(result.length, 1);
    assert.equal(result[0].status, "pending");
  });

  it("sends a friend request", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{
        id: 4,
        requester_id: 1,
        receiver_id: 2,
        status: "pending",
      }],
    }));

    const result =
      await friendshipService.sendRequest(1, 2);

    assert.equal(result.status, "pending");
    assert.equal(result.requester_id, 1);
    assert.equal(result.receiver_id, 2);

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 2]
    );
  });

  it("rejects self friend requests", async () => {
    await assert.rejects(
      friendshipService.sendRequest(1, 1),
      /Cannot send a friend request to yourself/
    );

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("rejects duplicate requests", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    await assert.rejects(
      friendshipService.sendRequest(1, 2),
      /already exists/
    );
  });

  it("accepts an incoming request", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, status: "accepted" }],
    }));

    const result =
      await friendshipService.acceptRequest(1, 2);

    assert.equal(result.status, "accepted");

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 2]
    );
  });

  it("rejects unauthorized accept attempts", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    await assert.rejects(
      friendshipService.acceptRequest(1, 3),
      /not authorized/
    );
  });

  it("declines an incoming request", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, status: "declined" }],
    }));

    const result =
      await friendshipService.declineRequest(1, 2);

    assert.equal(result.status, "declined");
  });

  it("cancels an outgoing request", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, status: "pending" }],
    }));

    const result =
      await friendshipService.cancelRequest(1, 2);

    assert.equal(result.id, 1);
  });

  it("removes an accepted friend", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 1, status: "accepted" }],
    }));

    const result =
      await friendshipService.removeFriend(1, 2);

    assert.equal(result.status, "accepted");
  });

  it("rejects unauthorized friend removal", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [],
    }));

    await assert.rejects(
      friendshipService.removeFriend(1, 99),
      /not authorized/
    );
  });
});
