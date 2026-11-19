import { useEffect, useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import AppHeader from "./components/AppHeader";

import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/Friends/FriendsPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import FriendSuggestionsPage from "./pages/FriendSuggestionsPage";
import DiscoverPage from "./pages/DiscoverPage";
import {
  clearAuthSession,
  readAuthToken,
} from "./services/authSession";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(
    () => !readAuthToken()
  );
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const token = readAuthToken();
    if (!token) return undefined;

    let active = true;

    async function restoreSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            clearAuthSession();
            return;
          }

          throw new Error("Could not verify your saved sign-in.");
        }

        const data = await response.json();
        if (!data.user?.id || !data.user.account_state) {
          throw new Error("The profile response is missing account information.");
        }

        if (active) setUser(data.user);
      } catch (error) {
        if (active) setSessionError(error.message);
      } finally {
        if (active) setSessionChecked(true);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function handleLogin(loggedInUser) {
    setSessionError("");
    setUser(loggedInUser);
  }

  function handleLogout() {
    clearAuthSession();
    setUser(null);
  }

  const accountState = user?.account_state?.toUpperCase();
  const accountPage = !sessionChecked
    ? <p role="status">Checking your account...</p>
    : !user
      ? <Login onLogin={handleLogin} />
    : accountState === "ONBOARDING_REQUIRED" || accountState === "CREATED"
      ? <Onboarding onLogout={handleLogout} />
      : accountState === "ACTIVE"
        ? <Dashboard onLogout={handleLogout} />
        : <p>Unknown account state.</p>;
  const isAuthenticated = Boolean(user);

  return (
    <>
      {isAuthenticated && <AppHeader />}
      {sessionError && (
        <p className="app-session-error" role="alert">
          {sessionError} <Link to="/login">Sign in again</Link>
        </p>
      )}
      <Routes>
        <Route
          path="/manage-friends"
          element={<FriendsPage />}
        />
        <Route path="/" element={<DiscoverPage isAuthenticated={isAuthenticated} />} />
        <Route path="/discover" element={<DiscoverPage isAuthenticated={isAuthenticated} />} />
        <Route path="/login" element={accountPage} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/manage-friends" element={<FriendsPage />} />
        <Route
          path="/suggestions"
          element={<FriendSuggestionsPage userId={user?.id} />}
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={accountPage} />
      </Routes>
    </>
  );
}

export default App;