
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// Make an authenticated request to the backend.
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in to manage friendships.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your session is invalid or has expired. Please log in again."
      );
    }

    throw new Error(
      data.message || "Friendship operation failed."
    );
  }

  return data;
}

export const friendshipApi = {
  // Get accepted friendships.
  async getFriends() {
    const data = await apiRequest("/api/friends");
    return data.friendships;
  },

  // Get incoming pending requests.
  async getIncomingRequests() {
    const data = await apiRequest(
      "/api/friends/requests/incoming"
    );

    return data.friendships;
  },

  // Get outgoing pending requests.
  async getOutgoingRequests() {
    const data = await apiRequest(
      "/api/friends/requests/outgoing"
    );

    return data.friendships;
  },

  // Send a request to another user.
  async sendRequest(receiverId) {
    return apiRequest("/api/friends/requests", {
      method: "POST",
      body: JSON.stringify({ receiverId }),
    });
  },

  // Accept a pending request.
  async acceptRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}/accept`,
      { method: "PATCH" }
    );
  },

  // Decline a pending request.
  async declineRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}/decline`,
      { method: "PATCH" }
    );
  },

  // Cancel an outgoing request.
  async cancelRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}`,
      { method: "DELETE" }
    );
  },

  // Remove an accepted friend.
  async removeFriend(friendshipId) {
    return apiRequest(
      `/api/friends/${friendshipId}`,
      { method: "DELETE" }
    );
  },
};
