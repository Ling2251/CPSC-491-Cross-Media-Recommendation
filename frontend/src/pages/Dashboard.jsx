
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";

const features = [
  {
    title: "Discover",
    description: "Explore books, movies, music, and more.",
    path: "/discover",
    icon: "✨",
  },
  {
    title: "Friends",
    description: "Manage friends and friend requests.",
    path: "/friends",
    icon: "👥",
  },
  {
    title: "Friend Suggestions",
    description: "Discover users with similar interests.",
    path: "/suggestions",
    icon: "🔎",
  },
  {
    title: "Activity Feed",
    description: "See what your friends are rating and reviewing.",
    path: "/activity-feed",
    icon: "📰",
  },
  {
    title: "Media Forums",
    description: "Join discussions about movies and other media.",
    path: "/media-forum/1",
    icon: "💬",
  },
];

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    onLogout?.();
    navigate("/");
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Cross Media Recommendations</h1>
          <p>Your personal media hub</p>
        </div>

        <button
          type="button"
          className="dashboard-logout"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </header>

      <section className="dashboard-welcome">
        <h2>Welcome back, {user?.name || "User"}!</h2>
        <p>
          Discover new media, connect with friends,
          and join discussions.
        </p>
      </section>

      <section className="dashboard-features">
        <h2>Explore Features</h2>

        <div className="dashboard-grid">
          {features.map((feature) => (
            <Link
              to={feature.path}
              key={feature.path}
              className="dashboard-card"
            >
              <span className="dashboard-icon">
                {feature.icon}
              </span>

              <h3>{feature.title}</h3>
              <p>{feature.description}</p>

              <span className="dashboard-card-link">
                Open Feature →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
