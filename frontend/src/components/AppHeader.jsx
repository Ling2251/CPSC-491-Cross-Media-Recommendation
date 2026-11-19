import { Link } from "react-router-dom";
import "./AppHeader.css";

const NAV_ITEMS = [
  { label: "Friends", to: "/friends" },
  { label: "Forum", to: "/forums" },
  { label: "Discover", to: "/discover" },
  { label: "Profile", to: "/profile" },
];

export default function AppHeader() {
  return (
    <header className="auth-navbar">
      <Link className="auth-logo" to="/discover">
        CrossMedia
      </Link>

      <nav className="auth-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
