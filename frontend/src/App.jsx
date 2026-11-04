import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage.jsx";
import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/Friends/FriendsPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import FriendSuggestionsPage from "./pages/FriendSuggestionsPage";

function App() {
  const [user, setUser] = useState(null);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  const accountPage = !user
    ? <Login onLogin={handleLogin} />
    : user.account_state === "ONBOARDING_REQUIRED" || user.account_state === "CREATED"
      ? <Onboarding onLogout={handleLogout} />
      : user.account_state === "ACTIVE"
        ? <Dashboard onLogout={handleLogout} />
        : <p>Unknown account state.</p>;

  return (
    <Routes>
      <Route
        path="/manage-friends"
        element={<FriendsPage />}
      />
      <Route path="/" element={<LandingPage />} />
      <Route path="/" element={accountPage} />
      <Route path="/login" element={accountPage} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/manage-friends" element={<FriendsPage />} />
      <Route path="/suggestions" element={<FriendSuggestionsPage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={accountPage} />
    </Routes>
  );
}

export default App;