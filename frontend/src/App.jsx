import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import AppHeader from "./components/AppHeader";

import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/Friends/FriendsPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import FriendSuggestionsPage from "./pages/FriendSuggestionsPage";
import DiscoverPage from "./pages/DiscoverPage";

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
  const accountPage = !user
    ? <Login onLogin={handleLogin} />
    : accountState === "ONBOARDING_REQUIRED" || accountState === "CREATED"
      ? <Onboarding onLogout={handleLogout} />
      : accountState === "ACTIVE"
        ? <Dashboard onLogout={handleLogout} />
        : <p>Unknown account state.</p>;
  const isAuthenticated = Boolean(user || localStorage.getItem("token"));

  return (
    <>
      {isAuthenticated && <AppHeader />}
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