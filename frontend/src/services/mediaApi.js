
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

async function apiRequest(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Media request failed.");
  }

  return data;
}

export const mediaApi = {
  async listMedia({ mediaType, tag } = {}) {
    const params = new URLSearchParams();
    if (mediaType) params.set("mediaType", mediaType);
    if (tag) params.set("tag", tag);

    const query = params.toString();
    const data = await apiRequest(`/api/media${query ? `?${query}` : ""}`);
    return data.media;
  },

  async getMediaById(mediaId) {
    const data = await apiRequest(`/api/media/${mediaId}`);
    return data.media;
  },
};
