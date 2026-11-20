import { Link } from "react-router-dom";
import "./AppHeader.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Discover", to: "/discover" },
  { label: "Friends", to: "/friends" },
  { label: "Suggestions", to: "/suggestions" },
  { label: "Activity", to: "/activity-feed" },
  { label: "Forum", to: "/media-forum/1" },
  { label: "AI Recommendations", to: "/ai-recommendations" },
];

export default function AppHeader({ onLogout }) {
  return (
    <header className="auth-navbar">
      <Link className="auth-logo" to="/dashboard">
        CrossMedia
      </Link>

      <nav className="auth-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            className={item.to === "/dashboard" ? "auth-dashboard-link" : ""}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
        <button className="auth-logout" onClick={onLogout} type="button">
          Log Out
        </button>
      </nav>
    </header>
  );
}
