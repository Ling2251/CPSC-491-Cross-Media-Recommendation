
const {
  describe,
  it,
  beforeEach,
  afterEach,
  mock,
} = require("node:test");

const assert = require("node:assert/strict");
const pool = require("../db");

const forumService = require("../services/mediaForumService");

describe("Media Forum Service", () => {
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

  it("validates correct IDs", () => {
    assert.doesNotThrow(() => {
      forumService.validateId(1);
    });
  });

  it("rejects invalid IDs", () => {
    for (const id of [0, -1, "1", null, 1.5, 2147483648]) {
      assert.throws(
        () => forumService.validateId(id),
        /Invalid ID/
      );
    }
  });

  it("accepts valid post content", () => {
    assert.equal(
      forumService.validateContent(" Great movie! "),
      "Great movie!"
    );
  });

  it("rejects empty content", () => {
    assert.throws(
      () => forumService.validateContent("   "),
      /Content must contain/
    );
  });

  it("rejects content over 2000 characters", () => {
    assert.throws(
      () => forumService.validateContent("a".repeat(2001)),
      /Content must contain/
    );
  });

  it("creates a forum post", async () => {
    const post = {
      id: 1,
      user_id: 1,
      media_id: 5,
      content: "What did everyone think?",
    };

    pool.query.mock.mockImplementation(async () => ({
      rows: [post],
    }));

    const result = await forumService.createPost(
      1,
      5,
      "What did everyone think?"
    );

    assert.deepEqual(result, post);

    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /INSERT INTO forum_posts/
    );

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [1, 5, "What did everyone think?"]
    );
  });

  it("retrieves posts for a media item", async () => {
    const posts = [
      {
        id: 1,
        media_id: 5,
        author_name: "Demo User A",
        content: "Great movie!",
      },
    ];

    pool.query.mock.mockImplementation(async () => ({
      rows: posts,
    }));

    const result = await forumService.getMediaPosts(5);

    assert.deepEqual(result, posts);

    assert.deepEqual(
      pool.query.mock.calls[0].arguments[1],
      [5, 20]
    );
  });

  it("creates a reply to a post", async () => {
    const reply = {
      id: 1,
      post_id: 5,
      user_id: 2,
      content: "I agree!",
    };

    pool.query.mock.mockImplementation(async () => ({
      rows: [reply],
    }));

    const result = await forumService.createReply(
      2,
      5,
      "I agree!"
    );

    assert.deepEqual(result, reply);

    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /INSERT INTO forum_replies/
    );
  });

  it("retrieves replies for a post", async () => {
    const replies = [
      {
        id: 1,
        post_id: 5,
        content: "Interesting!",
      },
    ];

    pool.query.mock.mockImplementation(async () => ({
      rows: replies,
    }));

    const result = await forumService.getPostReplies(5);

    assert.deepEqual(result, replies);

    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /ORDER BY r.created_at ASC/
    );
  });

  it("edits a post owned by the user", async () => {
    const updatedPost = {
      id: 5,
      user_id: 1,
      content: "Updated discussion",
    };

    pool.query.mock.mockImplementation(async () => ({
      rows: [updatedPost],
    }));

    const result = await forumService.editPost(
      1,
      5,
      "Updated discussion"
    );

    assert.equal(
      result.content,
      "Updated discussion"
    );

    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /WHERE id = \$2 AND user_id = \$1/
    );
  });

  it("rejects editing another user's post", async () => {
    await assert.rejects(
      forumService.editPost(
        2,
        5,
        "Unauthorized edit"
      ),
      /not authorized/
    );
  });

  it("deletes a post owned by the user", async () => {
    pool.query.mock.mockImplementation(async () => ({
      rows: [{ id: 5 }],
    }));

    const result = await forumService.deletePost(1, 5);

    assert.equal(result, true);

    assert.match(
      pool.query.mock.calls[0].arguments[0],
      /DELETE FROM forum_posts/
    );
  });

  it("rejects deleting another user's post", async () => {
    await assert.rejects(
      forumService.deletePost(2, 5),
      /not authorized/
    );
  });

  it("rejects invalid retrieval limits", async () => {
    await assert.rejects(
      forumService.getMediaPosts(5, 101),
      /Limit must be between 1 and 100/
    );

    assert.equal(pool.query.mock.calls.length, 0);
  });

  it("propagates database errors", async () => {
    pool.query.mock.mockImplementation(async () => {
      throw new Error("Database unavailable");
    });

    await assert.rejects(
      forumService.createPost(1, 5, "Test"),
      /Database unavailable/
    );
  });
});