// src/pages/FriendSuggestions/FriendSuggestions.jsx
import React, { useState, useEffect } from "react";
import FriendCard from "./FriendCard";
import FriendCardSkeleton from "./FriendCardSkeleton";
import FilterBar from "./FilterBar";
import "./FriendSuggestions.css";

const FriendSuggestions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  // TODO (Sprint 4): Replace this mock with a call to GET /api/v1/friend-recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // const res = await api.get('/friend-recommendations', { params: { limit: 20, offset: 0 }});
        // setUsers(res.data.users);
        await new Promise((r) => setTimeout(r, 800)); // simulate network
        setUsers(MOCK_USERS);
      } catch (err) {
        setError("Could not load recommendations. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  const filteredUsers =
    filter === "all"
      ? users
      : users.filter((u) => u.media_types?.includes(filter));

  return (
    <div className="fr-page">
      {/* ---------- Header ---------- */}
      <header className="fr-header">
        <div>
          <h1 className="fr-title">Friend Suggestions</h1>
          <p className="fr-subtitle">
            People who share your taste in movies, music, and books.
          </p>
        </div>
        <button className="fr-refresh-btn" onClick={() => window.location.reload()}>
          ↻ Refresh
        </button>
      </header>

      {/* ---------- Filter Bar ---------- */}
      <FilterBar active={filter} onChange={setFilter} />

      {/* ---------- Content ---------- */}
      <section className="fr-grid">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <FriendCardSkeleton key={i} />
          ))}

        {!loading && error && <div className="fr-error">{error}</div>}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="fr-empty">
            <h3>No suggestions yet</h3>
            <p>Interact with more media to expand your preferences.</p>
          </div>
        )}

        {!loading &&
          !error &&
          filteredUsers.map((user) => (
            <FriendCard key={user.id} user={user} />
          ))}
      </section>
    </div>
  );
};

// ---------- Mock data (delete once API is live) ----------
const MOCK_USERS = [
  {
    id: "1",
    username: "Sarah777",
    profile_pic: "https://i.pravatar.cc/100?img=5",
    bio: "Sci-fi obsessed. Will fight you about Interstellar.",
    similarity_score: 0.92,
    shared_tags: ["sci-fi", "thriller", "cyberpunk"],
    media_types: ["movies", "books"],
  },
  {
    id: "2",
    username: "CrazyDave777",
    profile_pic: "https://i.pravatar.cc/100?img=12",
    bio: "If a movie doesn't have action heroes or an adventure, I'm out.",
    similarity_score: 0.71,
    shared_tags: ["action", "adventure"],
    media_types: ["movies"],
  },
  {
    id: "3",
    username: "LoFiLuna",
    profile_pic: "https://i.pravatar.cc/100?img=32",
    bio: "Jazz, lo-fi, and Murakami novels.",
    similarity_score: 0.65,
    shared_tags: ["jazz", "chill", "drama"],
    media_types: ["music", "books"],
  },
  {
    id: "4",
    username: "BookishBen",
    profile_pic: "https://i.pravatar.cc/100?img=8",
    bio: "Reading my way through every Hugo winner.",
    similarity_score: 0.58,
    shared_tags: ["fantasy", "sci-fi"],
    media_types: ["books"],
  },
];

export default FriendSuggestions;