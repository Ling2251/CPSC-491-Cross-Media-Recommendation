// src/pages/FriendSuggestions/FilterBar.jsx
import React from "react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "movies", label: "Movies" },
  { key: "music", label: "Music" },
  { key: "books", label: "Books" },
];

const FilterBar = ({ active, onChange }) => {
  return (
    <nav className="fr-filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          className={`fr-filter-pill ${active === f.key ? "active" : ""}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </nav>
  );
};

export default FilterBar;