// src/data/users.js

// Temporary mock user data for Social Interactivity.
// Replace with SQL/backend data once the database is implemented.

export const users = [
  {
    id: 1,
    username: "Sarah777",
    profile_pic: "https://i.pravatar.cc/100?img=5",
    bio: "Sci-fi obsessed. Will fight you about Interstellar.",
    similarity_score: 0.92,
    shared_tags: ["sci-fi", "thriller", "cyberpunk"],
    media_types: ["movies", "books"],
  },
  {
    id: 2,
    username: "CrazyDave777",
    profile_pic: "https://i.pravatar.cc/100?img=12",
    bio: "If a movie doesn't have action heroes or an adventure, I'm out.",
    similarity_score: 0.71,
    shared_tags: ["action", "adventure"],
    media_types: ["movies"],
  },
  {
    id: 3,
    username: "LoFiLuna",
    profile_pic: "https://i.pravatar.cc/100?img=32",
    bio: "Jazz, lo-fi, and Murakami novels.",
    similarity_score: 0.65,
    shared_tags: ["jazz", "chill", "drama"],
    media_types: ["music", "books"],
  },
  {
    id: 4,
    username: "BookishBen",
    profile_pic: "https://i.pravatar.cc/100?img=8",
    bio: "Reading my way through every Hugo winner.",
    similarity_score: 0.58,
    shared_tags: ["fantasy", "sci-fi"],
    media_types: ["books"],
  },
];