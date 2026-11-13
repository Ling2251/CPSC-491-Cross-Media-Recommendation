export const AI_API_URL =
  import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function userIdFromToken(token) {
  if (!token) {
    return null;
  }

  const payloadPart = token.split(".")[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return Number.isInteger(payload.userId) ? payload.userId : null;
  } catch {
    return null;
  }
}

function messageFromError(data, status) {
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return "You can only view your own recommendations.";
  }
  if (status === 404) {
    return typeof data?.detail === "string" ? data.detail : "Not found.";
  }
  if (status === 422) {
    return "Some preference values are not valid.";
  }
  if (status === 503) {
    return "Recommendations are temporarily unavailable.";
  }
  return "Something went wrong. Please try again.";
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${AI_API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(messageFromError(data, response.status));
    error.status = response.status;
    throw error;
  }
  return data;
}

export const aiRecommendationApi = {
  getPreferences(userId, token) {
    return request(`/preferences/${userId}`, { token });
  },

  savePreferences(userId, preferences, token) {
    return request(`/preferences/${userId}`, { method: "PUT", token, body: preferences });
  },

  getRecommendations(userId, token, topN = 5) {
    return request(`/recommend/${userId}?top_n=${topN}`, { token });
  },
};
