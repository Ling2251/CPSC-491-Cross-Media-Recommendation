import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { mediaApi } from "../services/mediaApi";

function MediaDetail() {
  const { id } = useParams();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await mediaApi.getMediaById(id);
        if (active) setMedia(result);
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
  }, [id]);

  if (loading) return <p>Loading media...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!media) return <p>Media not found.</p>;

  return (
    <div>
      <p>
        <Link to="/media">Back to catalog</Link>
      </p>

      <h1>{media.title}</h1>
      <p>Type: {media.media_type}</p>
      {media.release_date && (
        <p>Released: {media.release_date.slice(0, 10)}</p>
      )}
      {media.description && <p>{media.description}</p>}

      <h2>Tags</h2>
      {media.tags.length === 0 ? (
        <p>No approved tags yet.</p>
      ) : (
        <ul>
          {media.tags.map((tag) => (
            <li key={tag.id}>
              {tag.name} ({tag.category})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MediaDetail;
