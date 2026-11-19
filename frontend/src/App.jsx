import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage.jsx";
import Dashboard from "./pages/Dashboard";
import FriendsPageApi from "./pages/Friends/FriendsPageApi";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import FriendSuggestionsPage from "./pages/FriendSuggestionsPage";
import ActivityFeedPage from "./pages/ActivityFeed/ActivityFeedPage";
import MediaForumPage from "./pages/MediaForum/MediaForumPage";
import DiscoverPage from "./pages/DiscoverPage";
import AppHeader from "./components/AppHeader";
import {
  clearAuthSession,
  readAuthToken,
} from "./services/authSession";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = readAuthToken();

      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          clearAuthSession();
          return;
        }

        if (!response.ok) {
          throw new Error("Session verification failed");
        }

        const data = await response.json();

        if (!data.user) {
          throw new Error("Missing user information");
        }

        if (!cancelled) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Session restoration error:", error);
        // Preserve the token on temporary network failures.
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setCheckingSession(false);
    navigate("/dashboard", { replace: true });
  }

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    setCheckingSession(false);
    navigate("/", { replace: true });
  }

  const accountState = user?.account_state?.toUpperCase();

  function renderDashboard() {
    if (checkingSession) {
      return <p>Restoring your session...</p>;
    }

    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    if (
      accountState === "CREATED" ||
      accountState === "ONBOARDING_REQUIRED"
    ) {
      return <Onboarding onLogout={handleLogout} />;
    }

    if (accountState === "ACTIVE") {
      return <Dashboard user={user} />;
    }

    return <p>Unknown account state.</p>;
  }

  return (
    <>
      {user && !checkingSession && (
        <AppHeader onLogout={handleLogout} />
      )}
      <Routes>
        <Route
          path="/"
          element={<LandingPage onLogin={handleLogin} />}
        />

        <Route
          path="/login"
          element={<LandingPage onLogin={handleLogin} />}
        />

        <Route
          path="/dashboard"
          element={renderDashboard()}
        />

        <Route
          path="/friends"
          element={<FriendsPageApi />}
        />

        <Route
          path="/manage-friends"
          element={<Navigate to="/friends" replace />}
        />

        <Route
          path="/suggestions"
          element={<FriendSuggestionsPage />}
        />

        <Route
          path="/discover"
          element={<DiscoverPage isAuthenticated={Boolean(user)} />}
        />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/activity-feed"
          element={<ActivityFeedPage />}
        />

        <Route
          path="/media-forum/:mediaId"
          element={<MediaForumPage />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;