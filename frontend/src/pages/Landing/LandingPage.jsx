
import { useState } from "react";
import "./LandingPage.css";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

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

  const handleSubmit = (event) => {
    event.preventDefault();

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

    if (!form.username.trim() || !form.password) {
      setMessage("Please enter your username/email and password.");
      return;
    }

    setMessage(
      "Login form validated. Authentication is not connected yet."
    );
  };

  return (
    <div className="auth-landing">
      <header className="auth-navbar">
        <a className="auth-logo" href="/">
          Main-page
        </a>

        <nav className="auth-nav">
          <a href="/">Home</a>
          <a href="/discover">Discover</a>
          <a href="/friends">Friends</a>
          <a href="/forums">Forums</a>
          <a href="/profile">Profile</a>
        </nav>
      </header>

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
                className={activeTab === "login" ? "active" : ""}
                onClick={() => switchTab("login")}
              >
                Log In
              </button>

              <button
                type="button"
                className={activeTab === "register" ? "active" : ""}
                onClick={() => switchTab("register")}
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
                    USERNAME OR EMAIL
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Username or email..."
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

              <button className="auth-submit" type="submit">
                {activeTab === "login"
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
              <button type="button" disabled title="Coming soon">
                Google
              </button>
              <button type="button" disabled title="Coming soon">
                Apple
              </button>
              <button type="button" disabled title="Coming soon">
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
