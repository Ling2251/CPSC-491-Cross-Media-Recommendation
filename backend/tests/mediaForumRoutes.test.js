
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

const forumService = require("../services/mediaForumService");
const forumRoutes = require("../routes/mediaForumRoutes");

describe("Media Forum API Routes", () => {
  let server;
  let baseUrl;
  let originalSecret;
  const originalMethods = {};

  const TEST_SECRET = "forum-route-test-secret";

  const methods = [
    "createPost",
    "getMediaPosts",
    "createReply",
    "getPostReplies",
    "editPost",
    "deletePost",
  ];

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

  function jsonOptions(method, body) {
    return {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };
  }

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    for (const name of methods) {
      originalMethods[name] = forumService[name];
    }

    const app = express();
    app.use(express.json());
    app.use("/api/forums", forumRoutes);

    server = app.listen(0);

    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.once("listening", resolve);
    });

    baseUrl =
      `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    forumService.createPost = mock.fn(
      async (userId, mediaId, content) => ({
        id: 10,
        user_id: userId,
        media_id: mediaId,
        content,
      })
    );

    forumService.getMediaPosts = mock.fn(
      async () => []
    );

    forumService.createReply = mock.fn(
      async (userId, postId, content) => ({
        id: 20,
        user_id: userId,
        post_id: postId,
        content,
      })
    );

    forumService.getPostReplies = mock.fn(
      async () => []
    );

    forumService.editPost = mock.fn(
      async (userId, postId, content) => ({
        id: postId,
        user_id: userId,
        content,
      })
    );

    forumService.deletePost = mock.fn(
      async () => true
    );
  });

  after(async () => {
    for (const name of methods) {
      forumService[name] = originalMethods[name];
    }

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
      "/api/forums/media/1"
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWTs", async () => {
    const result = await request(
      "/api/forums/media/1",
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      }
    );

    assert.equal(result.status, 401);
  });

  it("rejects invalid JWT user identities", async () => {
    const result = await authenticatedRequest(
      "/api/forums/media/1",
      {},
      0
    );

    assert.equal(result.status, 401);
  });

  it("retrieves posts for a media item", async () => {
    forumService.getMediaPosts = mock.fn(
      async () => [{
        id: 10,
        media_id: 1,
        content: "Great movie!",
      }]
    );

    const result = await authenticatedRequest(
      "/api/forums/media/1"
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.posts.length, 1);

    assert.deepEqual(
      forumService.getMediaPosts.mock.calls[0].arguments,
      [1, 20]
    );
  });

  it("supports a custom post limit", async () => {
    const result = await authenticatedRequest(
      "/api/forums/media/1?limit=10"
    );

    assert.equal(result.status, 200);

    assert.deepEqual(
      forumService.getMediaPosts.mock.calls[0].arguments,
      [1, 10]
    );
  });

  it("rejects invalid post limits", async () => {
    const result = await authenticatedRequest(
      "/api/forums/media/1?limit=101"
    );

    assert.equal(result.status, 400);
  });

  it("creates a post using the authenticated user", async () => {
    const result = await authenticatedRequest(
      "/api/forums/media/1",
      jsonOptions("POST", {
        userId: 999,
        content: "What did everyone think?",
      }),
      1
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.post.user_id, 1);

    assert.deepEqual(
      forumService.createPost.mock.calls[0].arguments,
      [1, 1, "What did everyone think?"]
    );
  });

  it("rejects empty post content", async () => {
    const result = await authenticatedRequest(
      "/api/forums/media/1",
      jsonOptions("POST", {
        content: "   ",
      })
    );

    assert.equal(result.status, 400);
    assert.equal(
      forumService.createPost.mock.calls.length,
      0
    );
  });

  it("retrieves replies for a post", async () => {
    forumService.getPostReplies = mock.fn(
      async () => [{
        id: 20,
        post_id: 10,
        content: "I agree!",
      }]
    );

    const result = await authenticatedRequest(
      "/api/forums/posts/10/replies"
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.replies.length, 1);
  });

  it("creates a reply using the authenticated user", async () => {
    const result = await authenticatedRequest(
      "/api/forums/posts/10/replies",
      jsonOptions("POST", {
        userId: 999,
        content: "I agree!",
      }),
      2
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.reply.user_id, 2);

    assert.deepEqual(
      forumService.createReply.mock.calls[0].arguments,
      [2, 10, "I agree!"]
    );
  });

  it("edits the authenticated user's post", async () => {
    const result = await authenticatedRequest(
      "/api/forums/posts/10",
      jsonOptions("PATCH", {
        content: "Updated discussion",
      })
    );

    assert.equal(result.status, 200);
    assert.equal(
      result.body.post.content,
      "Updated discussion"
    );
  });

  it("deletes the authenticated user's post", async () => {
    const result = await authenticatedRequest(
      "/api/forums/posts/10",
      { method: "DELETE" }
    );

    assert.equal(result.status, 200);

    assert.deepEqual(
      forumService.deletePost.mock.calls[0].arguments,
      [1, 10]
    );
  });

  it("rejects unauthorized post modifications", async () => {
    forumService.editPost = mock.fn(async () => {
      throw new Error("Post not found or not authorized");
    });

    const result = await authenticatedRequest(
      "/api/forums/posts/10",
      jsonOptions("PATCH", {
        content: "Unauthorized edit",
      }),
      2
    );

    assert.equal(result.status, 404);
  });

  it("rejects invalid post IDs", async () => {
    const result = await authenticatedRequest(
      "/api/forums/posts/invalid",
      { method: "DELETE" }
    );

    assert.equal(result.status, 400);
  });

  it("handles nonexistent media items", async () => {
    forumService.createPost = mock.fn(async () => {
      const error = new Error("Foreign key violation");
      error.code = "23503";
      throw error;
    });

    const result = await authenticatedRequest(
      "/api/forums/media/999",
      jsonOptions("POST", {
        content: "Test discussion",
      })
    );

    assert.equal(result.status, 404);
  });
});
