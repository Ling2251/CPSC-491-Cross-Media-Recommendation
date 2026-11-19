
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// Get the current user's authentication token.
function getAuthToken() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Please log in to use the Media Forum."
    );
  }

  return token;
}

// Handle responses from the backend.
async function handleResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Invalid response from the Media Forum server."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Media Forum request failed."
    );
  }

  return data;
}

// Send authenticated requests to the Media Forum API.
async function forumRequest(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/forums${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    }
  );

  return handleResponse(response);
}

// =====================================================
// GET MEDIA DISCUSSION POSTS
// GET /api/forums/media/:mediaId
// =====================================================

export async function getMediaPosts(mediaId, limit = 20) {
  const data = await forumRequest(
    `/media/${encodeURIComponent(mediaId)}?limit=${limit}`
  );

  return data.posts;
}

// =====================================================
// CREATE A DISCUSSION POST
// POST /api/forums/media/:mediaId
// =====================================================

export async function createForumPost(mediaId, content) {
  const data = await forumRequest(
    `/media/${encodeURIComponent(mediaId)}`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );

  return data.post;
}

// =====================================================
// GET REPLIES FOR A POST
// GET /api/forums/posts/:postId/replies
// =====================================================

export async function getPostReplies(postId) {
  const data = await forumRequest(
    `/posts/${encodeURIComponent(postId)}/replies`
  );

  return data.replies;
}

// =====================================================
// CREATE A REPLY
// POST /api/forums/posts/:postId/replies
// =====================================================

export async function createForumReply(postId, content) {
  const data = await forumRequest(
    `/posts/${encodeURIComponent(postId)}/replies`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );

  return data.reply;
}

// =====================================================
// EDIT YOUR OWN POST
// PATCH /api/forums/posts/:postId
// =====================================================

export async function editForumPost(postId, content) {
  const data = await forumRequest(
    `/posts/${encodeURIComponent(postId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );

  return data.post;
}

// =====================================================
// DELETE YOUR OWN POST
// DELETE /api/forums/posts/:postId
// =====================================================

export async function deleteForumPost(postId) {
  const data = await forumRequest(
    `/posts/${encodeURIComponent(postId)}`,
    {
      method: "DELETE",
    }
  );

  return data;
}
