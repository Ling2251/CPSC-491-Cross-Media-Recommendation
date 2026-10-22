
const { describe, it, beforeEach, mock } =
  require("node:test");

const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const friendshipService = require(
  "../services/friendshipService"
);

const friendshipRoutes = require(
  "../routes/friendshipRoutes"
);

const TEST_SECRET =
  "friendship-api-testing-secret-only";

process.env.JWT_SECRET = TEST_SECRET;

const app = express();
app.use(express.json());
app.use("/api/friends", friendshipRoutes);

function tokenFor(userId) {
  return jwt.sign(
    { userId },
    TEST_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
}

function authenticated(method, url, userId = 1) {
  return request(app)
    [method](url)
    .set("Authorization", `Bearer ${tokenFor(userId)}`);
}

const exampleFriendship = {
  id: 10,
  requester_id: 1,
  receiver_id: 2,
  status: "pending",
  created_at: "2026-10-15T12:00:00.000Z",
};

describe("Friendship API Routes", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it("rejects requests without a token", async () => {
    const response = await request(app)
      .get("/api/friends");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  it("rejects an invalid JWT", async () => {
    const response = await request(app)
      .get("/api/friends")
      .set("Authorization", "Bearer invalid-token");

    assert.equal(response.status, 401);
  });

  it("rejects an invalid user identity in a JWT", async () => {
    const response = await authenticated(
      "get",
      "/api/friends",
      0
    );

    assert.equal(response.status, 401);
  });

  it("gets accepted friendships", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "getFriends",
      async () => [{
        ...exampleFriendship,
        status: "accepted",
      }]
    );

    const response = await authenticated(
      "get",
      "/api/friends",
      1
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.friendships[0].status,
      "ACCEPTED"
    );

    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [1]
    );
  });

  it("gets incoming requests", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "getIncomingRequests",
      async () => [exampleFriendship]
    );

    const response = await authenticated(
      "get",
      "/api/friends/requests/incoming",
      2
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.friendships.length, 1);
    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [2]
    );
  });

  it("gets outgoing requests", async () => {
    mock.method(
      friendshipService,
      "getOutgoingRequests",
      async () => [exampleFriendship]
    );

    const response = await authenticated(
      "get",
      "/api/friends/requests/outgoing"
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.friendships.length, 1);
  });

  it("sends a friend request", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "sendRequest",
      async () => exampleFriendship
    );

    const response = await authenticated(
      "post",
      "/api/friends/requests"
    ).send({ receiverId: 2 });

    assert.equal(response.status, 201);
    assert.equal(response.body.friendship.status, "PENDING");

    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [1, 2]
    );
  });

  it("rejects sending a request to yourself", async () => {
    const response = await authenticated(
      "post",
      "/api/friends/requests"
    ).send({ receiverId: 1 });

    assert.equal(response.status, 400);
  });

  it("rejects invalid receiver IDs", async () => {
    const response = await authenticated(
      "post",
      "/api/friends/requests"
    ).send({ receiverId: "abc" });

    assert.equal(response.status, 400);
  });

  it("accepts a pending request", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "acceptRequest",
      async () => ({
        ...exampleFriendship,
        status: "accepted",
      })
    );

    const response = await authenticated(
      "patch",
      "/api/friends/requests/10/accept",
      2
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.friendship.status, "ACCEPTED");

    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [10, 2]
    );
  });

  it("declines a pending request", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "declineRequest",
      async () => ({
        ...exampleFriendship,
        status: "declined",
      })
    );

    const response = await authenticated(
      "patch",
      "/api/friends/requests/10/decline",
      2
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [10, 2]
    );
  });

  it("cancels an outgoing request", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "cancelRequest",
      async () => exampleFriendship
    );

    const response = await authenticated(
      "delete",
      "/api/friends/requests/10"
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [10, 1]
    );
  });

  it("removes an accepted friend", async () => {
    const serviceMock = mock.method(
      friendshipService,
      "removeFriend",
      async () => ({
        ...exampleFriendship,
        status: "accepted",
      })
    );

    const response = await authenticated(
      "delete",
      "/api/friends/10"
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      serviceMock.mock.calls[0].arguments,
      [10, 1]
    );
  });

  it("rejects invalid friendship IDs", async () => {
    const response = await authenticated(
      "delete",
      "/api/friends/invalid"
    );

    assert.equal(response.status, 400);
  });

  it("rejects unauthorized modifications", async () => {
    mock.method(
      friendshipService,
      "acceptRequest",
      async () => {
        throw new Error(
          "Pending request not found or not authorized."
        );
      }
    );

    const response = await authenticated(
      "patch",
      "/api/friends/requests/10/accept",
      3
    );

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
  });
});
