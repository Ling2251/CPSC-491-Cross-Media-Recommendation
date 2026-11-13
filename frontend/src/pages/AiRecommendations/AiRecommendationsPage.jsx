import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  aiRecommendationApi,
  getStoredToken,
  userIdFromToken,
} from "../../services/aiRecommendationApi";
import "./AiRecommendationsPage.css";

// Genre names must match tag_taxonomy names (category 'genre') in the database.
const GENRES = ["Action", "Animation", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller"];
const LANGUAGES = ["English", "French", "German", "Japanese", "Korean", "Spanish"];
const CONTENT_TYPES = [
  { value: "movie", label: "Movies" },
  { value: "tv_series", label: "TV Series" },
  { value: "book", label: "Books" },
  { value: "podcast", label: "Podcasts" },
];
const DEFAULT_PREFERENCES = {
  favorite_genres: [],
  preferred_languages: [],
  content_types: ["movie", "tv_series"],
  rating_threshold: 5,
  discovery_interest: true,
};

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function AiRecommendationsPage() {
  const [token] = useState(getStoredToken);
  const [userId] = useState(() => userIdFromToken(getStoredToken()));
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [recommendations, setRecommendations] = useState([]);
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadRecommendations() {
    const data = await aiRecommendationApi.getRecommendations(userId, token);
    setRecommendations(data.recommendations);
  }

  useEffect(() => {
    if (!token || userId === null) {
      return;
    }

    let cancelled = false;
    async function load() {
      setBusy(true);
      try {
        const saved = await aiRecommendationApi.getPreferences(userId, token);
        if (cancelled) return;
        setPreferences(saved);
        setHasSavedPreferences(true);
        await loadRecommendations();
      } catch (error) {
        if (cancelled) return;
        if (error.status !== 404) {
          setMessage(error.message);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // loadRecommendations reads only userId and token, which are listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (preferences.favorite_genres.length === 0) {
      setMessage("Choose at least one genre.");
      return;
    }
    if (preferences.preferred_languages.length === 0) {
      setMessage("Choose at least one language.");
      return;
    }
    if (preferences.content_types.length === 0) {
      setMessage("Choose at least one content type.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const saved = await aiRecommendationApi.savePreferences(userId, preferences, token);
      setPreferences(saved);
      setHasSavedPreferences(true);
      await loadRecommendations();
      setMessage("Preferences saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token || userId === null) {
    return (
      <main className="ai-page">
        <h1>AI Recommendations</h1>
        <p>Log in to see recommendations based on your preferences.</p>
        <Link to="/login">Go to login</Link>
      </main>
    );
  }

  return (
    <main className="ai-page">
      <h1>AI Recommendations</h1>

      <form className="ai-preferences" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Favorite genres</legend>
          {GENRES.map((genre) => (
            <label key={genre}>
              <input
                type="checkbox"
                checked={preferences.favorite_genres.includes(genre)}
                onChange={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    favorite_genres: toggleValue(prev.favorite_genres, genre),
                  }))
                }
              />
              {genre}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Languages</legend>
          {LANGUAGES.map((language) => (
            <label key={language}>
              <input
                type="checkbox"
                checked={preferences.preferred_languages.includes(language)}
                onChange={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    preferred_languages: toggleValue(prev.preferred_languages, language),
                  }))
                }
              />
              {language}
            </label>
          ))}
          <p className="ai-note">Languages are saved now and will affect ranking once media has language data.</p>
        </fieldset>

        <fieldset>
          <legend>Content types</legend>
          {CONTENT_TYPES.map((type) => (
            <label key={type.value}>
              <input
                type="checkbox"
                checked={preferences.content_types.includes(type.value)}
                onChange={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    content_types: toggleValue(prev.content_types, type.value),
                  }))
                }
              />
              {type.label}
            </label>
          ))}
        </fieldset>

        <label>
          Minimum rating
          <input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={preferences.rating_threshold}
            onChange={(event) =>
              setPreferences((prev) => ({ ...prev, rating_threshold: Number(event.target.value) }))
            }
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={preferences.discovery_interest}
            onChange={(event) =>
              setPreferences((prev) => ({ ...prev, discovery_interest: event.target.checked }))
            }
          />
          Open to discovering new content
        </label>

        <button type="submit" disabled={busy}>
          Save preferences
        </button>
      </form>

      {message && <p role="status" className="ai-message">{message}</p>}

      <section aria-label="Recommendations">
        <h2>Recommended for you</h2>
        {busy && <p>Loading...</p>}
        {!busy && !hasSavedPreferences && <p>Save your preferences to see recommendations.</p>}
        {!busy && hasSavedPreferences && recommendations.length === 0 && (
          <p>No matches yet. Try selecting more genres or content types.</p>
        )}
        <ol className="ai-results">
          {recommendations.map((item) => (
            <li key={item.media_id}>
              <strong>{item.title}</strong>
              <span className="ai-score">Score {item.score}</span>
              <p>{item.reason}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default AiRecommendationsPage;
