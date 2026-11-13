
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

function getAuthToken() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in to manage activity privacy.");
  }

  return token;
}

async function handleResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Activity privacy request failed."
    );
  }

  return data;
}

// Retrieve the logged-in user's activity-sharing setting.
export async function getActivityPrivacy() {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/privacy/activity`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse(response);
}

// Update the logged-in user's activity-sharing setting.
export async function updateActivityPrivacy(activityPublic) {
  if (typeof activityPublic !== "boolean") {
    throw new Error("Activity privacy must be a boolean.");
  }

  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/privacy/activity`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activityPublic }),
    }
  );

  return handleResponse(response);
}
