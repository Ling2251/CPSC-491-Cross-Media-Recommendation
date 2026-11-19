
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function getFriendsActivityFeed(limit = 20) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in to view your activity feed.");
  }

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/feed?limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to load activity feed."
    );
  }

  return data.activities;
}
