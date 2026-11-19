
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function LandingPage({ onLogin }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("login");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
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

  const switchTab = (tab) => {
    setActiveTab(tab);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    // ==========================================
    // REGISTRATION - EXISTING PLACEHOLDER
    // ==========================================

    if (activeTab === "register") {
      if (!form.username.trim() || !form.email.trim()) {
        setMessage("Please complete all required fields.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setMessage("Please enter a valid email address.");
        return;
      }

      if (form.password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      setMessage(
        "Registration form validated. Account creation is not connected yet."
      );

      return;
    }

    // ==========================================
    // LOGIN VALIDATION
    // ==========================================

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

      // Store JWT for authenticated API requests.
      localStorage.setItem("token", data.token);

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
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="auth-panel">
          <div className="auth-form-container">
            <div className="auth-tabs">
              <button
                type="button"
                className={
                  activeTab === "login" ? "active" : ""
                }
                onClick={() => switchTab("login")}
                disabled={loading}
              >
                Log In
              </button>

              <button
                type="button"
                className={
                  activeTab === "register" ? "active" : ""
                }
                onClick={() => switchTab("register")}
                disabled={loading}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {activeTab === "register" && (
                <>
                  <div className="auth-field">
                    <label htmlFor="register-username">
                      USERNAME
                    </label>

                    <input
                      id="register-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Choose a username..."
                      value={form.username}
                      onChange={updateForm}
                      required
                    />
                  </div>

                  <div className="auth-field">
                    <label htmlFor="register-email">
                      EMAIL
                    </label>

                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email address..."
                      value={form.email}
                      onChange={updateForm}
                      required
                    />
                  </div>
                </>
              )}

              {activeTab === "login" && (
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
              )}

              <div className="auth-field">
                <label htmlFor="auth-password">
                  PASSWORD
                </label>

                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={
                    activeTab === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  placeholder="Password..."
                  value={form.password}
                  onChange={updateForm}
                  required
                />
              </div>

              {activeTab === "register" && (
                <div className="auth-field">
                  <label htmlFor="confirm-password">
                    CONFIRM PASSWORD
                  </label>

                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password..."
                    value={form.confirmPassword}
                    onChange={updateForm}
                    required
                  />
                </div>
              )}

              {activeTab === "login" && (
                <div className="auth-forgot">
                  <span>
                    Forgot password? Contact support.
                  </span>
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : activeTab === "login"
                    ? "Log In"
                    : "Create Account"}
              </button>

              {message && (
                <p className="auth-message" role="status">
                  {message}
                </p>
              )}
            </form>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-social-buttons">
              <button
                type="button"
                disabled
                title="Coming soon"
              >
                Google
              </button>

              <button
                type="button"
                disabled
                title="Coming soon"
              >
                Apple
              </button>

              <button
                type="button"
                disabled
                title="Coming soon"
              >
                Facebook
              </button>
            </div>

            <p className="auth-legal">
              By continuing you agree to our{" "}
              <span>Terms of Service</span> and{" "}
              <span>Privacy Policy</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
