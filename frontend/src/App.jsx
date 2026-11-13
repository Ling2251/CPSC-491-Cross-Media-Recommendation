
import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage.jsx";
import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/Friends/FriendsPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import FriendSuggestionsPage from "./pages/FriendSuggestionsPage";
import AiRecommendationsPage from "./pages/AiRecommendations/AiRecommendationsPage";

function App() {
  const [user, setUser] = useState(null);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  const accountState = user?.account_state?.toUpperCase();

  function renderDashboard() {
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
      return <Dashboard onLogout={handleLogout} />;
    }

    return <p>Unknown account state.</p>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={renderDashboard()}
      />

      <Route
        path="/dashboard"
        element={renderDashboard()}
      />

      <Route
        path="/friends"
        element={<FriendsPage />}
      />

      <Route
        path="/manage-friends"
        element={<FriendsPage />}
      />

      <Route
        path="/suggestions"
        element={<FriendSuggestionsPage />}
      />

      <Route
        path="/ai-recommendations"
        element={<AiRecommendationsPage />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
