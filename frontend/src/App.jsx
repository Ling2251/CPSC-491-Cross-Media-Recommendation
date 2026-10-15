import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage.jsx";
import FriendsPage from "./pages/Friends/FriendsPage";

function App() {
  return (
    <Routes>
      <Route
        path="/manage-friends"
        element={<FriendsPage />}
      />
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}

export default App;