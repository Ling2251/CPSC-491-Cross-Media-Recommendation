
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  async getFriends() {
    const data = await apiRequest("/api/friends");
    return data.friendships;
  },

  async getIncomingRequests() {
    const data = await apiRequest(
      "/api/friends/requests/incoming"
    );
    return data.friendships;
  },

  async getOutgoingRequests() {
    const data = await apiRequest(
      "/api/friends/requests/outgoing"
    );
    return data.friendships;
  },

  async sendRequest(receiverId) {
    return apiRequest("/api/friends/requests", {
      method: "POST",
      body: JSON.stringify({ receiverId }),
    });
  },

  async acceptRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}/accept`,
      { method: "PATCH" }
    );
  },

  async declineRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}/decline`,
      { method: "PATCH" }
    );
  },

  async cancelRequest(requestId) {
    return apiRequest(
      `/api/friends/requests/${requestId}`,
      { method: "DELETE" }
    );
  },

  async removeFriend(friendshipId) {
    return apiRequest(
      `/api/friends/${friendshipId}`,
      { method: "DELETE" }
    );
  },
};
