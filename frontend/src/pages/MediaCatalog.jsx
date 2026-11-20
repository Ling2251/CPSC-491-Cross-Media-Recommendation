import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { mediaApi } from "../services/mediaApi";

function MediaCatalog() {
  const [media, setMedia] = useState([]);
  const [mediaType, setMediaType] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const results = await mediaApi.listMedia({
          mediaType: mediaType || undefined,
        });
        if (active) setMedia(results);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [mediaType]);

  return (
    <div>
      <h1>Media Catalog</h1>

      <label>
        Media type:{" "}
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
        >
          <option value="">All</option>
          <option value="movie">Movie</option>
          <option value="book">Book</option>
        </select>
      </label>

      {loading && <p>Loading media...</p>}
      {error && <p>Error: {error}</p>}

      {!loading && !error && media.length === 0 && (
        <p>No media found.</p>
      )}

      <ul>
        {media.map((item) => (
          <li key={item.id}>
            <Link to={`/media/${item.id}`}>
              {item.title} ({item.media_type})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MediaCatalog;
