import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DiscoverPage.css";

const CATEGORIES = ["All", "Movies", "Books", "Music", "TV", "Podcasts"];

const MEDIA = [
  {
    id: "interstellar",
    title: "Interstellar",
    creator: "Christopher Nolan · 2014",
    category: "Movies",
    note: "A journey beyond the stars",
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=85",
    tone: "space",
  },
  {
    id: "the-midnight-library",
    title: "The Midnight Library",
    creator: "Matt Haig · 2020",
    category: "Books",
    note: "One library. Infinite possibilities.",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=85",
    tone: "book",
  },
  {
    id: "random-access-memories",
    title: "Random Access Memories",
    creator: "Daft Punk · 2013",
    category: "Music",
    note: "A little dance, a little nostalgia",
    image:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=85",
    tone: "music",
  },
  {
    id: "blue-planet",
    title: "Blue Planet II",
    creator: "BBC · 2017",
    category: "TV",
    note: "See the ocean in a new light",
    image:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=85",
    tone: "ocean",
  },
  {
    id: "the-daily",
    title: "The Daily",
    creator: "The New York Times · 2017",
    category: "Podcasts",
    note: "The stories shaping your world",
    image:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=800&q=85",
    tone: "podcast",
  },
  {
    id: "everything-everywhere",
    title: "Everything Everywhere All at Once",
    creator: "Daniel Kwan & Daniel Scheinert · 2022",
    category: "Movies",
    note: "The multiverse is yours to explore",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85",
    tone: "film",
  },
];

const FAVORITES_KEY = "crossmedia-favorites";

function readFavorites() {
  try {
    const storedFavorites = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );
    return Array.isArray(storedFavorites) ? storedFavorites : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

function DiscoverPage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState(readFavorites);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const visibleMedia =
    activeCategory === "All"
      ? MEDIA
      : MEDIA.filter((item) => item.category === activeCategory);

  function toggleFavorite(item) {
    if (!isAuthenticated) {
      setSelectedMedia(item);
      return;
    }

    setFavorites((currentFavorites) => {
      const nextFavorites = currentFavorites.includes(item.id)
        ? currentFavorites.filter((id) => id !== item.id)
        : [...currentFavorites, item.id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
      return nextFavorites;
    });
  }

  return (
    <main className="discover-page">
      <header className="discover-header">
        {!isAuthenticated && (
          <div className="discover-brand">
            <span className="discover-brand-mark" aria-hidden="true">✦</span>
            <span>CrossMedia</span>
          </div>
        )}
        <div className="discover-hero">
          <p className="discover-eyebrow">YOUR NEXT FAVORITE THING</p>
          <h1>Find your next <span>obsession.</span></h1>
          <p className="discover-intro">
            Stories, sounds, and worlds worth getting lost in — picked for
            curious people like you.
          </p>
        </div>
      </header>

      <section className="discover-content" aria-label="Discover media">
        <div className="discover-section-heading">
          <div>
            <p className="discover-kicker">A LITTLE BIT OF EVERYTHING</p>
            <h2>Explore the good stuff</h2>
          </div>
          <nav className="discover-categories" aria-label="Filter by media type">
            {CATEGORIES.map((category) => (
              <button
                aria-pressed={activeCategory === category}
                className={activeCategory === category ? "is-active" : ""}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </nav>
        </div>

        <div className="discover-grid">
          {visibleMedia.map((item, index) => {
            const isFavorite = favorites.includes(item.id);
            return (
              <article
                className="discover-card"
                key={item.id}
                style={{ "--card-order": index }}
              >
                <div className={`discover-art discover-art-${item.tone}`}>
                  <img alt="" loading="lazy" src={item.image} />
                  <span className="discover-art-shade" />
                  <span className="discover-category">{item.category}</span>
                  <button
                    aria-label={
                      isFavorite
                        ? `Remove ${item.title} from favorites`
                        : `Add ${item.title} to favorites`
                    }
                    aria-pressed={isAuthenticated ? isFavorite : undefined}
                    className={`discover-favorite${isFavorite ? " is-saved" : ""}`}
                    onClick={() => toggleFavorite(item)}
                    type="button"
                  >
                    {isFavorite ? "✓" : "+"}
                  </button>
                  <div className="discover-art-title">
                    <span>{item.note}</span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <div className="discover-card-info">
                  <h3>{item.title}</h3>
                  <p>{item.creator}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedMedia && (
        <div
          className="discover-modal-backdrop"
          onClick={() => setSelectedMedia(null)}
        >
          <section
            aria-labelledby="discover-signin-title"
            aria-modal="true"
            className="discover-signin-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close sign-in prompt"
              className="discover-modal-close"
              onClick={() => setSelectedMedia(null)}
              type="button"
            >
              ×
            </button>
            <span className="discover-modal-icon" aria-hidden="true">＋</span>
            <p className="discover-kicker">SAVE IT FOR LATER</p>
            <h2 id="discover-signin-title">Make it a favorite.</h2>
            <p>
              Sign in or create an account to add <strong>{selectedMedia.title}</strong>
              {" "}to your collection.
            </p>
            <button
              className="discover-signup-button"
              onClick={() => navigate("/signup", {
                state: { mediaTitle: selectedMedia.title },
              })}
              type="button"
            >
              Create an account
            </button>
            <button
              className="discover-login-button"
              onClick={() => navigate("/login")}
              type="button"
            >
              I already have an account
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default DiscoverPage;
