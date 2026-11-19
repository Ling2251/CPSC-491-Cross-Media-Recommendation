
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { persistAuthToken } from "../../services/authSession";
import "./LandingPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function LandingPage({ onLogin }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const email = form.username.trim();

    if (!email || !form.password) {
      setMessage("Please enter your email and password.");
      return;
    }

    // ==========================================
    // BACKEND AUTHENTICATION
    // ==========================================

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        return;
      }

      if (!data.token || !data.user) {
        setMessage(
          "Login response is missing authentication information."
        );
        return;
      }

      if (typeof onLogin !== "function") {
        setMessage("Login configuration error.");
        return;
      }

      persistAuthToken(data.token, true);

      // Update App.jsx authentication state.
      onLogin(data.user);

      // Clear password from form state.
      setForm((previous) => ({
        ...previous,
        password: "",
      }));

      // Navigate to the authenticated dashboard.
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Could not connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-landing">
      <main className="auth-layout">
        {/* LEFT SIDE */}
        <section className="auth-intro">
          <div className="auth-intro-content">
            <h1>[ Cross Media Recommendations ]</h1>

            <p className="auth-description">
              Discover new media based on what you
              already love — across books, music, film,
              games, and more.
            </p>

            <ul className="auth-benefits">
              <li>Cross-media recommendations</li>
              <li>Tag-based discovery engine</li>
              <li>Community forums and friend activity</li>
              <li>Build and share personal libraries</li>
            </ul>
            <Link className="auth-explore-link" to="/discover">
              Explore as a guest <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="auth-panel">
          <div className="auth-form-container">
            <div className="auth-tabs">
              <button
                type="button"
                className="active"
                disabled={loading}
              >
                Log In
              </button>
              <Link className="auth-tab-link" to="/signup">
                Create Account
              </Link>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="login-username">
                  EMAIL
                </label>

                <input
                  id="login-username"
                  name="username"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address..."
                  value={form.username}
                  onChange={updateForm}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password">
                  PASSWORD
                </label>

                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password..."
                  value={form.password}
                  onChange={updateForm}
                  required
                />
              </div>

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>

              {message && (
                <p className="auth-message" role="status">
                  {message}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
