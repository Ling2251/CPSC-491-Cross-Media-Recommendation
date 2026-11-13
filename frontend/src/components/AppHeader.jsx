import { Link } from "react-router-dom";
import "./AppHeader.css";

const NAV_ITEMS = [
  { label: "Home", to: "/" },
  { label: "Discover", to: "/discover" },
  { label: "Friends", to: "/friends" },
  { label: "Friend Suggestions", to: "/suggestions" },
  { label: "Forums", to: "/forums" },
  { label: "Profile", to: "/profile" },
];

export default function AppHeader() {
  return (
    <header className="auth-navbar">
      <Link className="auth-logo" to="/">
        Main-page
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
