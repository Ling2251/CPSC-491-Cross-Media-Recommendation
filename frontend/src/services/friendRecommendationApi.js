const API_BASE_URL =
  import.meta.env.VITE_RECOMMENDATION_API_URL || "http://localhost:8000";

async function apiRequest(path) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: path.endsWith("/demo") ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      data.detail || data.message || "Could not load friend recommendations."
    );
  }

  if (!Array.isArray(data.recommendations)) {
    throw new Error("The recommendation response is invalid.");
  }

  return {
    userId: data.user_id ?? data.userId,
    recommendations: data.recommendations,
  };
}

export const friendRecommendationApi = {
  getRecommendations() {
    const endpoint = localStorage.getItem("token")
      ? "/api/friend-recommendations/recalculate"
      : "/api/friend-recommendations/demo";
    return apiRequest(endpoint);
  },
};
