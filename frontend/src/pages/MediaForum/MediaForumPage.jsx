
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getMediaPosts,
  createForumPost,
  getPostReplies,
  createForumReply,
  editForumPost,
  deleteForumPost,
} from "../../services/mediaForumApi";

import "./MediaForumPage.css";

function getCurrentUserId() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = Number(payload.userId);

    return Number.isSafeInteger(userId) && userId > 0
      ? userId
      : null;
  } catch {
    return null;
  }
}

function MediaForumPage() {
  const { mediaId } = useParams();
  const currentUserId = getCurrentUserId();

  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState({});
  const [newPost, setNewPost] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPosts() {
    setLoading(true);
    setError("");

    try {
      const data = await getMediaPosts(mediaId);
      setPosts(data);
    } catch (err) {
      setError(err.message || "Failed to load discussions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [mediaId]);

  async function loadReplies(postId) {
    try {
      const data = await getPostReplies(postId);

      setReplies((previous) => ({
        ...previous,
        [postId]: data,
      }));
    } catch (err) {
      setError(err.message || "Failed to load replies.");
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();

    if (!newPost.trim() || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createForumPost(mediaId, newPost.trim());
      setNewPost("");
      setMessage("Discussion post created successfully.");
      await loadPosts();
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReply(event, postId) {
    event.preventDefault();

    const content = replyInputs[postId]?.trim();

    if (!content || saving) return;

    setSaving(true);
    setError("");

    try {
      await createForumReply(postId, content);

      setReplyInputs((previous) => ({
        ...previous,
        [postId]: "",
      }));

      await loadReplies(postId);
    } catch (err) {
      setError(err.message || "Failed to create reply.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditPost(event, postId) {
    event.preventDefault();

    if (!editContent.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      await editForumPost(postId, editContent.trim());
      setEditingPostId(null);
      setEditContent("");
      await loadPosts();
    } catch (err) {
      setError(err.message || "Failed to edit post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm("Delete this discussion post?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteForumPost(postId);

      setPosts((previous) =>
        previous.filter((post) => post.id !== postId)
      );

      setReplies((previous) => {
        const updated = { ...previous };
        delete updated[postId];
        return updated;
      });

      setMessage("Discussion post deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <main className="media-forum-page">
      <Link to="/dashboard" className="back-dashboard-link">
        ← Back to Dashboard
      </Link>

      <header className="media-forum-header">
        <h1>Media Discussion Forum</h1>
        <p>Discuss media item #{mediaId} with other users.</p>

        <button type="button" onClick={loadPosts}>
          Refresh Discussions
        </button>
      </header>

      <section className="media-forum-create">
        <h2>Create a Discussion</h2>

        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPost}
            onChange={(event) =>
              setNewPost(event.target.value)
            }
            placeholder="What did you think about this media?"
            maxLength={2000}
            rows={4}
            required
          />

          <button
            type="submit"
            disabled={saving || !newPost.trim()}
          >
            {saving ? "Saving..." : "Create Post"}
          </button>
        </form>
      </section>

      {error && (
        <div role="alert" className="media-forum-error">
          {error}
        </div>
      )}

      {message && (
        <p role="status" className="media-forum-success">
          {message}
        </p>
      )}

      <section className="media-forum-discussions">
        <h2>Discussions</h2>

        {loading && <p>Loading discussions...</p>}

        {!loading && posts.length === 0 && (
          <p>No discussions yet. Start the conversation!</p>
        )}

        {!loading &&
          posts.map((post) => (
            <article className="media-forum-post" key={post.id}>
              <div className="media-forum-post-header">
                <strong>
                  {post.author_name || `User ${post.user_id}`}
                </strong>
                <time dateTime={post.created_at}>
                  {formatDate(post.created_at)}
                </time>
              </div>

              {editingPostId === post.id ? (
                <form
                  onSubmit={(event) =>
                    handleEditPost(event, post.id)
                  }
                >
                  <textarea
                    value={editContent}
                    onChange={(event) =>
                      setEditContent(event.target.value)
                    }
                    maxLength={2000}
                    required
                  />

                  <button type="submit" disabled={saving}>
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPostId(null)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <p>{post.content}</p>
              )}

              <div className="media-forum-actions">
                <button
                  type="button"
                  onClick={() => loadReplies(post.id)}
                >
                  View Replies
                </button>

                {currentUserId === Number(post.user_id) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(post.id);
                        setEditContent(post.content);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeletePost(post.id)
                      }
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              <div className="media-forum-replies">
                {(replies[post.id] || []).map((reply) => (
                  <div
                    className="media-forum-reply"
                    key={reply.id}
                  >
                    <strong>
                      {reply.author_name ||
                        `User ${reply.user_id}`}
                    </strong>
                    <p>{reply.content}</p>
                  </div>
                ))}

                <form
                  onSubmit={(event) =>
                    handleReply(event, post.id)
                  }
                >
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyInputs[post.id] || ""}
                    onChange={(event) =>
                      setReplyInputs((previous) => ({
                        ...previous,
                        [post.id]: event.target.value,
                      }))
                    }
                    maxLength={2000}
                    required
                  />

                  <button
                    type="submit"
                    disabled={
                      saving || !replyInputs[post.id]?.trim()
                    }
                  >
                    Reply
                  </button>
                </form>
              </div>
            </article>
          ))}
      </section>
    </main>
  );
}

export default MediaForumPage;
